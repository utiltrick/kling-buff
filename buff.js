(async () => {
    // =================================================================
    // CẤU HÌNH: DÁN URL VERCEL API CỦA BẠN VÀO ĐÂY
    // =================================================================
    const YOUR_VERCEL_APP_URL = 'https://kling-api-proxy.vercel.app'; // Đã cập nhật link của bạn
    // =================================================================

    // --- KHAI BÁO CÁC HÀM ---
    function generatePassword(length = 10) { /* ... implementation from before ... */ }
    async function fetchEmail() { /* ... implementation from before ... */ }
    async function fetchVerificationCode(email) { /* ... implementation from from before ... */ }
    async function waitForElement(selector, timeout = 15000) { /* ... implementation from before ... */ }

    // --- PHẦN LOGIC CHÍNH ĐIỀU KHIỂN LUỒNG CHẠY ---

    const config = JSON.parse(sessionStorage.getItem('klingBuffConfig'));

    // 1. NẾU CHƯA CÓ CẤU HÌNH -> BẮT ĐẦU MỘT PHIÊN LÀM VIỆC MỚI
    if (!config) {
        console.log("🚀 Bắt đầu phiên làm việc mới.");
        const followLink = prompt("Nhập link buff follow:");
        if (!followLink || !followLink.startsWith('https://app.klingai.com/')) return alert("❌ Link không hợp lệ.");

        const runCount = parseInt(prompt("Nhập số lần chạy:"));
        if (isNaN(runCount) || runCount <= 0) return alert("❌ Số lần chạy không hợp lệ.");

        const newConfig = {
            followLink: followLink,
            totalRuns: runCount,
            currentRun: 1
        };
        sessionStorage.setItem('klingBuffConfig', JSON.stringify(newConfig));
        
        console.log(`✅ Đã lưu cấu hình: Chạy ${runCount} lần. Bắt đầu lần 1...`);
        alert(`Script sẽ bắt đầu chạy ${runCount} lần. Trang sẽ tự động tải lại. Vui lòng không đóng tab.`);
        
        // Bắt đầu lần chạy đầu tiên bằng cách điều hướng đến trang chủ
        window.location.href = 'https://app.klingai.com/global';
        return; // Dừng script ở đây, nó sẽ chạy lại sau khi trang tải xong
    }

    // 2. NẾU ĐÃ CÓ CẤU HÌNH -> TIẾP TỤC PHIÊN LÀM VIỆC
    console.log(`🔄 Tiếp tục phiên làm việc, đang ở lần chạy ${config.currentRun}/${config.totalRuns}.`);

    // Kiểm tra xem đã hoàn thành chưa
    if (config.currentRun > config.totalRuns) {
        console.log("🎉 Hoàn thành tất cả các lần chạy!");
        sessionStorage.removeItem('klingBuffConfig');
        alert("🎉 Đã hoàn thành tất cả các lần chạy!");
        return;
    }

    // Hàm thực hiện flow chính
    async function runFlow(conf) {
        try {
            console.log(`--- Bắt đầu flow cho lần chạy ${conf.currentRun} ---`);
            const { email } = await fetchEmail();
            const password = generatePassword();
            console.log("Tài khoản mới:", { email, password });

            await waitForElement('div.login').then(e => e.click());
            console.log("➡️ Đã nhấn 'Sign In'");
            await new Promise(r => setTimeout(r, 1000));
            await waitForElement('div.sign-in-button[style*="margin-top: 24px"]').then(e => e.click());
            console.log("➡️ Đã nhấn 'Sign in with email'");
            await new Promise(r => setTimeout(r, 1000));
            await waitForElement('p.clickable a').then(e => e.click());
            console.log("➡️ Đã nhấn 'Sign up for free'");

            const emailInput = await waitForElement('input[placeholder="Enter Email Address"]');
            const passInput = await waitForElement('input[placeholder="Password (at least 8 characters)"]');
            const confirmInput = await waitForElement('input[placeholder="Confirm Password"]');

            emailInput.value = email; passInput.value = password; confirmInput.value = password;
            [emailInput, passInput, confirmInput].forEach(input => input.dispatchEvent(new Event('input', { bubbles: true })));

            await waitForElement('.generic-button.critical.large').then(e => e.click());
            await new Promise(r => setTimeout(r, 8000)); // Chờ captcha

            const codeInput = await waitForElement('input[placeholder="Verification Code"]');
            const code = await fetchVerificationCode(email);
            if (!code) throw new Error("Không thể tự động lấy mã xác minh.");

            codeInput.value = code;
            codeInput.dispatchEvent(new Event('input', { bubbles: true }));

            await waitForElement('button.generic-button.critical.large:not([disabled])').then(e => e.click());
            console.log("✅ Đăng ký thành công!");
            
            await new Promise(r => setTimeout(r, 3000));

            console.log(`🌐 Điều hướng đến link follow: ${conf.followLink}`);
            window.location.href = conf.followLink;
            await new Promise(r => setTimeout(r, 5000));

            await waitForElement('button.follow-button').then(e => e.click());
            console.log("✅ Đã nhấn nút Follow.");

            // Cập nhật bộ đếm TRƯỚC KHI điều hướng trang cuối cùng
            conf.currentRun++;
            sessionStorage.setItem('klingBuffConfig', JSON.stringify(conf));
            console.log(`✅ Hoàn thành lần chạy ${conf.currentRun - 1}. Chuẩn bị cho lần tiếp theo.`);

            // Đăng xuất và bắt đầu vòng lặp mới
            window.location.href = 'https://app.klingai.com/global';

        } catch (err) {
            console.error("❌ Flow thất bại:", err);
            alert(`Lỗi ở lần chạy ${config.currentRun}. Script sẽ dừng lại. Vui lòng làm mới trang và chạy lại script để bắt đầu phiên mới.`);
            sessionStorage.removeItem('klingBuffConfig'); // Xóa cấu hình để có thể chạy lại từ đầu
        }
    }

    // 3. CHẠY FLOW HIỆN TẠI
    // Chỉ chạy flow nếu đang ở trang chủ Kling
    if (window.location.href.includes('https://app.klingai.com/global')) {
        await runFlow(config);
    }

    /* Thêm lại các hàm đã bị ẩn để script hoàn chỉnh */
    function generatePassword(length = 10) { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"; let password = ""; for (let i = 0; i < length; i++) { password += chars.charAt(Math.floor(Math.random() * chars.length)); } return password; }
    async function fetchEmail() { const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/create-email`, { method: 'POST' }); if (!res.ok) throw new Error("Không thể gọi API create-email trên Vercel."); const json = await res.json(); console.log(`✅ Lấy email thành công: ${json.email}`); return { email: json.email }; }
    async function fetchVerificationCode(email) { console.log(`⏳ Đang tìm mã xác minh cho ${email}...`); for (let i = 0; i < 30; i++) { try { const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/check-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) }); const json = await res.json(); if (json && json.text) { const match = json.text.match(/\b\d{6}\b/); if (match) { console.log(`✅ Tìm thấy mã: ${match[0]}`); return match[0]; } } await new Promise(r => setTimeout(r, 2000)); } catch (err) { console.error("Lỗi khi gọi check-email:", err); } } console.warn("⚠️ Hết thời gian chờ, không tìm thấy mã xác minh."); return null; }
    async function waitForElement(selector, timeout = 15000) { return new Promise((resolve, reject) => { const el = document.querySelector(selector); if (el) return resolve(el); const observer = new MutationObserver(() => { const foundEl = document.querySelector(selector); if (foundEl) { observer.disconnect(); resolve(foundEl); } }); observer.observe(document.body, { childList: true, subtree: true }); setTimeout(() => { observer.disconnect(); reject(new Error(`Timeout chờ phần tử: ${selector}`)); }, timeout); }); }
})();
