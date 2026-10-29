/**
 * 登录密码传输加密：RSA PKCS#1 v1.5（公钥 PEM，SPKI/X.509 格式）。
 *
 * 纯 BigInt 实现、零依赖，不依赖 crypto.subtle（非 HTTPS 环境也可用）。
 * 与后端 Cipher.getInstance("RSA/ECB/PKCS1Padding") 互操作；密钥由后台
 * 「服务器设置 · 生成密钥对」产出，经 /auth/public-settings 下发公钥。
 */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64ToBytes(b64: string): Uint8Array {
    const clean = b64.replace(/[^A-Za-z0-9+/]/g, '')
    const lookup = new Uint8Array(123)
    for (let i = 0; i < B64_CHARS.length; i++) lookup[B64_CHARS.charCodeAt(i)] = i
    const byteLen = Math.floor(clean.length * 3 / 4)
    const bytes = new Uint8Array(byteLen)
    let p = 0
    for (let i = 0; i + 3 < clean.length; i += 4) {
        const a = lookup[clean.charCodeAt(i)]
        const b = lookup[clean.charCodeAt(i + 1)]
        const c = lookup[clean.charCodeAt(i + 2)]
        const d = lookup[clean.charCodeAt(i + 3)]
        bytes[p++] = (a << 2) | (b >> 4)
        if (p < byteLen) bytes[p++] = ((b & 15) << 4) | (c >> 2)
        if (p < byteLen) bytes[p++] = ((c & 3) << 6) | d
    }
    return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
    let out = ''
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i]
        const b = i + 1 < bytes.length ? bytes[i + 1] : 0
        const c = i + 2 < bytes.length ? bytes[i + 2] : 0
        out += B64_CHARS[a >> 2] + B64_CHARS[((a & 3) << 4) | (b >> 4)]
        out += i + 1 < bytes.length ? B64_CHARS[((b & 15) << 2) | (c >> 6)] : '='
        out += i + 2 < bytes.length ? B64_CHARS[c & 63] : '='
    }
    return out
}

function bytesToBigInt(bytes: Uint8Array): bigint {
    let v = 0n
    for (const b of bytes) v = (v << 8n) | BigInt(b)
    return v
}

function bigIntToBytes(v: bigint, len: number): Uint8Array {
    const out = new Uint8Array(len)
    let x = v
    for (let i = len - 1; i >= 0; i--) {
        out[i] = Number(x & 0xffn)
        x >>= 8n
    }
    return out
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let result = 1n
    let b = base % mod
    let e = exp
    while (e > 0n) {
        if (e & 1n) result = (result * b) % mod
        b = (b * b) % mod
        e >>= 1n
    }
    return result
}

function readDerLength(der: Uint8Array, offset: number): { length: number; next: number } {
    let len = der[offset]
    offset++
    if (len < 0x80) return {length: len, next: offset}
    const n = len & 0x7f
    len = 0
    for (let i = 0; i < n; i++) {
        len = (len << 8) | der[offset++]
    }
    return {length: len, next: offset}
}

/** 跳过一个完整 TLV（offset 指向 tag 字节），返回下一个 TLV 起点 */
function skipTlv(der: Uint8Array, offset: number): number {
    const {length, next} = readDerLength(der, offset + 1)
    return next + length
}

function parsePublicKeyPem(pem: string): { n: bigint; e: bigint; byteLen: number } {
    const b64 = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '')
    const der = base64ToBytes(b64)
    let p = 0
    if (der[p++] !== 0x30) throw new Error('无效的公钥格式')
    p = readDerLength(der, p).next
    // AlgorithmIdentifier SEQUENCE
    if (der[p] !== 0x30) throw new Error('无效的公钥格式')
    p = skipTlv(der, p)
    // BIT STRING（0 unused bits）包裹 RSAPublicKey
    if (der[p] !== 0x03) throw new Error('无效的公钥格式')
    const bs = readDerLength(der, p + 1)
    if (der[bs.next] !== 0x00) throw new Error('无效的公钥格式')
    p = bs.next + 1
    // RSAPublicKey SEQUENCE { INTEGER n, INTEGER e }
    if (der[p] !== 0x30) throw new Error('无效的公钥格式')
    const rs = readDerLength(der, p + 1)
    p = rs.next
    if (der[p] !== 0x02) throw new Error('无效的公钥格式')
    const nl = readDerLength(der, p + 1)
    let nBytes = der.slice(nl.next, nl.next + nl.length)
    p = nl.next + nl.length
    if (der[p] !== 0x02) throw new Error('无效的公钥格式')
    const el = readDerLength(der, p + 1)
    const eBytes = der.slice(el.next, el.next + el.length)
    // 去掉符号位前导 0 再算模长
    let nStart = 0
    while (nStart < nBytes.length - 1 && nBytes[nStart] === 0) nStart++
    nBytes = nBytes.slice(nStart)
    return {
        n: bytesToBigInt(nBytes),
        e: bytesToBigInt(eBytes),
        byteLen: nBytes.length
    }
}

/**
 * 用公钥 PEM 加密明文（PKCS#1 v1.5 type 2 填充），返回 base64 密文。
 * 与后端 RSA/ECB/PKCS1Padding 解密互操作。
 */
export function rsaEncryptWithPublicKey(plaintext: string, publicKeyPem: string): string {
    const {n, e, byteLen} = parsePublicKeyPem(publicKeyPem)
    const data = new TextEncoder().encode(plaintext)
    const k = byteLen
    if (data.length > k - 11) {
        throw new Error('待加密内容过长')
    }
    const psLen = k - 3 - data.length
    const block = new Uint8Array(k)
    block[0] = 0x00
    block[1] = 0x02
    const random = new Uint8Array(psLen)
    const cryptoObj = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto : null
    for (let i = 0; i < psLen; i++) {
        let r = 0
        while (r === 0) {
            if (cryptoObj) {
                const buf = new Uint8Array(1)
                cryptoObj.getRandomValues(buf)
                r = buf[0]
            } else {
                r = Math.floor(Math.random() * 255) + 1
            }
        }
        random[i] = r
    }
    block.set(random, 2)
    block[2 + psLen] = 0x00
    block.set(data, 3 + psLen)
    const cipher = modPow(bytesToBigInt(block), e, n)
    return bytesToBase64(bigIntToBytes(cipher, k))
}
