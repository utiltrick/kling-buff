(async () => {
    // =================================================================
    // CẤU HÌNH: DÁN URL VERCEL API CỦA BẠN VÀO ĐÂY
    // =================================================================
    const YOUR_VERCEL_APP_URL = 'https://kling-api-proxy.vercel.app'; // Đã cập nhật link của bạn
    // =================================================================

    console.log("🚀 Script bắt đầu... (Cấu trúc gốc, dùng Mailsac)");

    // --- CÁC HÀM TIỆN ÍCH ---
    function generatePassword(length = 10) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    async function waitForElement(selector, timeout = 20000) {
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                const el = document.querySelector(selector);
                if (el) {
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve(el);
                }
            }, 500);
            const timer = setTimeout(() => {
                clearInterval(interval);
                reject(new Error(`Timeout chờ phần tử: ${selector}`));
            }, timeout);
        });
    }

    async function waitForCaptcha(timeout = 30000) {
        console.log("🧩 Đang chờ captcha (nếu có)...");
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (!document.querySelector('.kwai-captcha-slider-wrapper')) {
                    clearInterval(interval);
                    clearTimeout(timer);
                    console.log("✅ Captcha đã được xử lý hoặc không xuất hiện.");
                    resolve();
                }
            }, 500);
            const timer = setTimeout(() => {
                clearInterval(interval);
                console.warn("⚠️ Hết thời gian chờ captcha, tiếp tục flow...");
                resolve();
            }, timeout);
        });
    }

    // --- CÁC HÀM API ĐÃ ĐƯỢC THAY THẾ ---

    // THAY THẾ 1: Dùng API Mailsac để tạo email
    async function fetchEmail() {
        try {
            const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/create-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error(`Lỗi API create-email: ${res.status}`);
            const json = await res.json();
            if (!json.email) throw new Error("Phản hồi API không chứa email.");
            
            console.log(`✅ Nhận được email: ${json.email}`);
            return { email: json.email }; // Trả về object chứa email
        } catch (err) {
            console.error("❌ Lỗi khi gọi API create-email:", err.message);
            throw err;
        }
    }

    // THAY THẾ 2: Dùng API Mailsac để kiểm tra email
    async function fetchVerificationCode(email) {
        if (!email) {
            console.warn("⚠️ Không có email, bỏ qua lấy mã.");
            return null;
        }
        console.log(`⏳ Đang chờ mã xác minh cho ${email}...`);
        for (let i = 0; i < 30; i++) {
            try {
                const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/check-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
                if (!res.ok) throw new Error(`Lỗi API check-email: ${res.status}`);
                const json = await res.json();
                
                if (json && json.text) {
                    const content = json.text;
                    const match = content.match(/\b\d{6}\b/);
                    if (match) {
                        console.log(`✅ Tìm thấy mã xác minh: ${match[0]}`);
                        return match[0];
                    }
                }
                await new Promise(r => setTimeout(r, 2000));
            } catch (err) {
                console.error("❌ Lỗi khi gọi API check-email:", err.message);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        console.warn("⚠️ Không tìm thấy mã xác minh trong email sau 60 giây.");
        return null;
    }

    // --- FLOW CHÍNH GIỮ NGUYÊN CẤU TRÚC GỐC ---
    
    async function runFlow(followLink) {
        try {
            const { email } = await fetchEmail();
            const password = generatePassword();
            console.log("Tài khoản mới:", { email, password });

            // Bắt đầu luồng đăng ký
            const signInBtn = await waitForElement('div.login');
            signInBtn.click();
            console.log("➡️ Click Sign In");
            await new Promise(r => setTimeout(r, 1000));

            let emailBtn;
            document.querySelectorAll('div.sign-in-button span.caption').forEach(caption => {
                if (caption.innerText.trim() === 'Sign in with email') {
                    emailBtn = caption.closest('div.sign-in-button');
                }
            });
            if (!emailBtn) {
                emailBtn = document.querySelector('div.sign-in-button[style*="margin-top: 24px"]');
            }
            if (!emailBtn) throw new Error("❌ Không tìm thấy nút Sign in with email");
            emailBtn.click();
            console.log("➡️ Click Sign in with Email");

            await new Promise(r => setTimeout(r, 1000));

            const signUpLink = await waitForElement('p.clickable a');
            signUpLink.click();
            console.log("➡️ Click Sign up for free");

            const emailInput = await waitForElement('input[placeholder="Enter Email Address"]');
            const passInput = await waitForElement('input[placeholder="Password (at least 8 characters)"]');
            const confirmInput = await waitForElement('input[placeholder="Confirm Password"]');

            emailInput.value = email;
            passInput.value = password;
            confirmInput.value = password;
            [emailInput, passInput, confirmInput].forEach(input => input.dispatchEvent(new Event('input', { bubbles: true })));

            const nextBtn = await waitForElement('.generic-button.critical.large');
            nextBtn.click();
            console.log("➡️ Đã click Next, chờ captcha...");

            await waitForCaptcha(30000);

            const codeInput = await waitForElement('input[placeholder="Verification Code"]', 60000);
            const code = await fetchVerificationCode(email); // Chỉ cần truyền email
            if (!code) {
                throw new Error("Không thể tự động lấy mã xác minh.");
            }

            codeInput.value = code;
            codeInput.dispatchEvent(new Event('input', { bubbles: true }));
            codeInput.dispatchEvent(new Event('change', { bubbles: true }));

            const finalSubmitBtn = await waitForElement('button.generic-button.critical.large:not([disabled])');
            finalSubmitBtn.click();
            console.log("✅ Đã nhập mã và submit hoàn tất đăng ký!");

            // Tại điểm này, trang có thể tự động điều hướng. Script cần phải đủ linh hoạt.
            await new Promise(r => setTimeout(r, 5000)); // Chờ trang ổn định sau khi đăng ký

            console.log(`🌐 Đang vào link buff follow: ${followLink}`);
            // Lệnh này sẽ gây tải lại trang, có thể làm ngắt vòng lặp for ở ngoài
            window.location.href = followLink;
            await new Promise(r => setTimeout(r, 5000)); // Chờ trang follow tải xong

            const followBtn = await waitForElement('button.follow-button', 10000);
            followBtn.click();
            console.log("✅ Đã nhấn nút Follow");

            console.log("🌐 Đang vào trang Profile Settings để đăng xuất...");
            // Lệnh này cũng sẽ gây tải lại trang
            window.location.href = 'https://app.klingai.com/global/account';
            await new Promise(r => setTimeout(r, 3000)); 

            const profileSettingsBtn = await waitForElement('button:contains("Profile Settings"), .profile-settings', 10000);
            profileSettingsBtn.click();
            console.log("✅ Đã nhấn nút Profile Settings");

            const signOutBtn = await waitForElement('button:contains("Sign Out"), .sign-out', 10000);
            signOutBtn.click();
            console.log("✅ Đã nhấn nút Sign Out");

            await new Promise(r => setTimeout(r, 2000)); // Chờ đăng xuất xong
            
        } catch (err) {
            console.error("❌ Flow thất bại:", err);
            throw err;
        }
    }

    // --- VÒNG LẶP CHÍNH GIỮ NGUYÊN CẤU TRÚC GỐC ---
    async function main() {
        while (true) {
            const followLink = prompt("Nhập link buff follow (ví dụ: https://app.klingai.com/global/user-home/7054579/all):");
            if (!followLink || !followLink.startsWith('https://app.klingai.com/')) {
                console.error("❌ Link không hợp lệ, phải bắt đầu bằng https://app.klingai.com/");
                continue;
            }

            const runCountInput = prompt("Nhập số lần chạy (số nguyên dương):");
            const runCount = parseInt(runCountInput);
            if (isNaN(runCount) || runCount <= 0) {
                console.error("❌ Số lần chạy không hợp lệ, phải là số nguyên dương");
                continue;
            }

            console.log(`🔄 Sẽ chạy ${runCount} lần với link: ${followLink}`);

            for (let i = 1; i <= runCount; i++) {
                console.log(`\n\n--- Bắt đầu lần chạy thứ ${i}/${runCount} ---`);
                try {
                    await runFlow(followLink);
                    console.log(`✅ Hoàn thành lần chạy thứ ${i}`);
                } catch (err) {
                    console.error(`❌ Lỗi ở lần chạy thứ ${i}:`, err);
                    // Nếu có lỗi, có thể dừng vòng lặp để tránh lặp lại lỗi
                    // break; 
                }
                // Nếu không có lỗi, chờ một chút trước khi chạy lần tiếp theo
                await new Promise(r => setTimeout(r, 2000));
            }
            console.log("✅ Đã hoàn thành tất cả các lần chạy cho phiên này. Bắt đầu phiên mới...");
        }
    }

    // Chạy chương trình
    try {
        await main();
    } catch (err) {
        console.error("❌ Script thất bại:", err);
    }
})();
