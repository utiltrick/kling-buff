// --- BƯỚC 3: ĐĂNG XUẤT (PHIÊN BẢN CẬP NHẬT) ---
(async () => {
    // Hàm tìm nút dựa trên văn bản bên trong nó
    async function findButtonByText(text) {
        console.log(`Đang tìm nút có chữ "${text}"...`);
        // Chờ một chút để đảm bảo các phần tử đã xuất hiện
        await new Promise(r => setTimeout(r, 2000));

        const allButtons = document.querySelectorAll('button');
        for (const button of allButtons) {
            if (button.textContent.trim().includes(text)) {
                console.log(`✅ Đã tìm thấy nút "${text}"!`);
                return button;
            }
        }
        throw new Error(`Không tìm thấy nút nào có chứa chữ: "${text}"`);
    }

    // --- LOGIC CHÍNH CỦA BƯỚC 3 ---
    try {
        // Có thể trang Account không có nút "Profile Settings" và hiển thị luôn nút Sign Out
        // Chúng ta sẽ thử tìm và nhấn nút "Sign Out" trực tiếp
        try {
            const signOutBtn = await findButtonByText('Sign Out');
            signOutBtn.click();
        } catch (e) {
            // Nếu không thấy, có thể nó bị ẩn sau nút "Profile Settings"
            console.log('Không thấy nút "Sign Out", thử tìm "Profile Settings"...');
            const profileSettingsBtn = await findButtonByText('Profile Settings');
            profileSettingsBtn.click();

            // Chờ nút "Sign Out" xuất hiện rồi nhấn
            const signOutBtnAfterClick = await findButtonByText('Sign Out');
            signOutBtnAfterClick.click();
        }

        console.log("✅ Đã Đăng xuất! Chuyển về trang chủ.");
        await new Promise(r => setTimeout(r, 3000));
        window.location.href = 'https://app.klingai.com/global/';

    } catch (err) {
        console.error("❌ Lỗi ở Bước 3:", err);
    }
})();
