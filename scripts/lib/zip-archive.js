'use strict';

const zlib = require('zlib');

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    CRC_TABLE[index] = value >>> 0;
}

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function toDosTimestamp(date) {
    const value = date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
    const year = Math.max(1980, value.getFullYear());
    const time = (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2);
    const day = ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate();
    return { time, day };
}

function createLocalHeader(entry) {
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(entry.method, 8);
    header.writeUInt16LE(entry.time, 10);
    header.writeUInt16LE(entry.day, 12);
    header.writeUInt32LE(entry.crc, 14);
    header.writeUInt32LE(entry.compressed.length, 18);
    header.writeUInt32LE(entry.source.length, 22);
    header.writeUInt16LE(entry.name.length, 26);
    return header;
}

function createCentralHeader(entry, offset) {
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(entry.method, 10);
    header.writeUInt16LE(entry.time, 12);
    header.writeUInt16LE(entry.day, 14);
    header.writeUInt32LE(entry.crc, 16);
    header.writeUInt32LE(entry.compressed.length, 20);
    header.writeUInt32LE(entry.source.length, 24);
    header.writeUInt16LE(entry.name.length, 28);
    header.writeUInt32LE(offset, 42);
    return header;
}

function prepareEntry(input) {
    const nameText = String(input.name || '').replace(/\\/g, '/');
    if (!nameText || nameText.startsWith('/') || nameText.includes('../')) throw new Error('ZIP 파일 경로가 올바르지 않습니다.');
    const source = Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data);
    const deflated = zlib.deflateRawSync(source, { level: 6 });
    const useDeflate = deflated.length < source.length;
    const stamp = toDosTimestamp(input.modifiedAt);
    return {
        name: Buffer.from(nameText, 'utf8'), source,
        compressed: useDeflate ? deflated : source,
        method: useDeflate ? 8 : 0, crc: crc32(source),
        time: stamp.time, day: stamp.day
    };
}

function createEndRecord(entryCount, centralSize, centralOffset) {
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entryCount, 8);
    end.writeUInt16LE(entryCount, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(centralOffset, 16);
    return end;
}

function createZipArchive(inputs) {
    const entries = inputs.map(prepareEntry);
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    entries.forEach(entry => {
        const localHeader = createLocalHeader(entry);
        localParts.push(localHeader, entry.name, entry.compressed);
        const centralHeader = createCentralHeader(entry, offset);
        centralParts.push(centralHeader, entry.name);
        offset += localHeader.length + entry.name.length + entry.compressed.length;
    });
    const central = Buffer.concat(centralParts);
    return Buffer.concat([...localParts, central, createEndRecord(entries.length, central.length, offset)]);
}

module.exports = { createZipArchive };
