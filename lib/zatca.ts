export function generateZatcaQR(sellerName: string, vatNumber: string, timestamp: string, total: string, vatTotal: string) {
    const toHex = (val: string) => Buffer.from(val, 'utf8').toString('hex');
    const toTag = (tag: number, val: string) => {
        const hexVal = toHex(val);
        const hexTag = tag.toString(16).padStart(2, '0');
        const hexLen = (hexVal.length / 2).toString(16).padStart(2, '0');
        return hexTag + hexLen + hexVal;
    };
    
    const qrHex = toTag(1, sellerName) +
                  toTag(2, vatNumber) +
                  toTag(3, timestamp) +
                  toTag(4, total) +
                  toTag(5, vatTotal);
                  
    return Buffer.from(qrHex, 'hex').toString('base64');
}