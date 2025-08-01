// --- BƯỚC 2: FOLLOW (PHIÊN BẢN CẬP NHẬT) ---
(async () => {
    // Hàm tìm nút dựa trên văn bản bên trong nó
    async function findButtonByText(text) {
        console.log(`Đang tìm nút có chữ "${text}"...`);
        // Chờ một chút để đảm bảo các phần tử đã xuất hiện
        await new Promise(r => setTimeout(r, 2000)); 

        const allButtons = document.querySelectorAll('button');
        for (const button of allButtons) {
            // .textContent sẽ lấy tất cả văn bản bên trong, kể cả các thẻ con
            if (button.textContent.trim().includes(text)) {
                console.log(`✅ Đã tìm thấy nút "${text}"!`);
                return button;
            }
        }
        throw new Error(`Không tìm thấy nút nào có chứa chữ: "${text}"`);
    }

    // --- LOGIC CHÍNH CỦA BƯỚC 2 ---
    try {
        const followBtn = await findButtonByText('Follow');
        followBtn.click();
        
        console.log("✅ Đã Follow! Đang chuyển đến trang tài khoản...");
        await new Promise(r => setTimeout(r, 3000));
        window.location.href = 'https://app.klingai.com/global/account';
        
    } catch (err) {
        console.error("❌ Lỗi ở Bước 2:", err);
    }
})();
