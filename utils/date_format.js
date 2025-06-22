const getVietnamTime = () => {
    const utc = new Date();
    const vietnamTime = new Date(utc.getTime() + 7 * 60 * 60 * 1000);
    return vietnamTime;
}

module.exports = { getVietnamTime }