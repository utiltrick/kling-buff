(async () => {
    // =================================================================
    // CẤU HÌNH: DÁN URL VERCEL API CỦA BẠN VÀO ĐÂY
    // Bạn cần deploy các file API đã được cung cấp trước đó lên Vercel để lấy URL này.
    // =================================================================
    const YOUR_VERCEL_APP_URL = 'https://kling-api-proxy.vercel.app'; // <--- VÍ DỤ, THAY THẾ BẰNG URL THỰC TẾ CỦA BẠN
    // =================================================================


    console.log("🚀 Script bắt đầu... (Phiên bản Mailsac)");
    if (YOUR_VERCEL_APP_URL.includes('your-name-here')) {
         alert("LỖI: Bạn chưa cập nhật YOUR_VERCEL_APP_URL trong script. Vui lòng dán link Vercel của bạn vào.");
         return;
    }

    // Hàm tạo mật khẩu ngẫu nhiên (giữ nguyên)
    function generatePassword(length = 10) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    // THAY ĐỔI 1: Hàm lấy email được đơn giản hóa.
    // Nó sẽ gọi API 'create-email' trên Vercel của bạn để lấy một địa chỉ email Mailsac ngẫu nhiên.
    async function fetchEmail() {
        try {
            console.log("📨 Đang yêu cầu email mới từ API Vercel...");
            const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/create-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error(`Lỗi API create-email: ${res.status}`);
            const json = await res.json();
            if (!json.email) throw new Error("Phản hồi API không chứa email.");
            
            console.log(`✅ Nhận được email: ${json.email}`);
            return { email: json.email }; // Chỉ trả về email, không còn sessionId hay authToken
        } catch (err) {
            console.error("❌ Lỗi khi gọi API create-email:", err.message);
            throw err;
        }
    }

    // THAY ĐỔI 2: Hàm lấy mã xác minh được cập nhật.
    // Nó nhận 'email' làm tham số và gọi API 'check-email' trên Vercel.
    async function fetchVerificationCode(email) {
        if (!email) {
            console.warn("⚠️ Không có email, bỏ qua lấy mã.");
            return null;
        }
        console.log(`⏳ Đang chờ mã xác minh cho ${email}...`);
        // Lặp lại trong 60 giây (30 lần * 2 giây)
        for (let i = 0; i < 30; i++) {
            try {
                const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/check-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email }) // Gửi email cần kiểm tra
                });
                if (!res.ok) throw new Error(`Lỗi API check-email: ${res.status}`);
                
                const json = await res.json();
                
                // Xử lý phản hồi đơn giản từ API Mailsac
                if (json && json.text) {
                    const content = json.text;
                    console.log("📧 Nhận được nội dung email.");
                    const match = content.match(/\b\d{6}\b/); // Tìm mã 6 chữ số
                    if (match) {
                        console.log(`✅ Tìm thấy mã xác minh: ${match[0]}`);
                        return match[0];
                    }
                }
                // Nếu không có email, đợi 2 giây rồi thử lại
                await new Promise(r => setTimeout(r, 2000));
            } catch (err) {
                console.error("❌ Lỗi khi gọi API check-email:", err.message);
                // Chờ một chút trước khi thử lại để tránh spam server
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        console.warn("⚠️ Không tìm thấy mã xác minh trong email sau 60 giây.");
        return null;
    }

    // Các hàm tiện ích (waitForElement, waitForCaptcha, v.v.) được giữ nguyên
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
    
    // ... các hàm tiện ích khác có thể thêm vào đây nếu cần ...

    // Hàm thực hiện flow chính
    async function runFlow(followLink) {
        try {
            // THAY ĐỔI 3: Luồng logic được đơn giản hóa, không còn sessionId, authToken.
            const { email } = await fetchEmail();
            const password = generatePassword();
            console.log("Tài khoản mới:", { email, password });

            // Bắt đầu luồng đăng ký trên giao diện
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

            emailInput.value = email;
            passInput.value = password;
            confirmInput.value = password;
            [emailInput, passInput, confirmInput].forEach(input => input.dispatchEvent(new Event('input', { bubbles: true })));

            await waitForElement('.generic-button.critical.large').then(e => e.click());
            console.log("➡️ Đã nhấn 'Next', đang chờ captcha...");

            await waitForCaptcha(30000);

            const codeInput = await waitForElement('input[placeholder="Verification Code"]', 60000);
            const code = await fetchVerificationCode(email);
            if (!code) {
                throw new Error("Không thể tự động lấy mã xác minh.");
            }

            codeInput.value = code;
            codeInput.dispatchEvent(new Event('input', { bubbles: true }));

            await waitForElement('button.generic-button.critical.large:not([disabled])').then(e => e.click());
            console.log("✅ Đăng ký thành công!");
            
            await new Promise(r => setTimeout(r, 3000)); // Chờ login và chuyển trang

            console.log(`🌐 Điều hướng đến link follow: ${followLink}`);
            window.location.href = followLink;
            await new Promise(r => setTimeout(r, 5000)); // Chờ trang tải

            await waitForElement('button.follow-button').then(e => e.click());
            console.log("✅ Đã nhấn nút Follow.");

            console.log("🌐 Đăng xuất để chuẩn bị cho lần chạy tiếp theo...");
            window.location.href = 'https://app.klingai.com/global/account/sign-out';
            await new Promise(r => setTimeout(r, 3000)); // Chờ đăng xuất

        } catch (err) {
            console.error("❌ Flow thất bại:", err);
            throw err;
        }
    }

    // Hàm chính để chạy vòng lặp
    async function main() {
        const followLink = prompt("Nhập link buff follow (ví dụ: https://app.klingai.com/global/user-home/7054579/all):");
        if (!followLink || !followLink.startsWith('https://app.klingai.com/')) {
            return alert("❌ Link không hợp lệ.");
        }

        const runCount = parseInt(prompt("Nhập số lần chạy:"));
        if (isNaN(runCount) || runCount <= 0) {
            return alert("❌ Số lần chạy không hợp lệ.");
        }

        console.log(`🔄 Sẽ chạy ${runCount} lần với link: ${followLink}`);

        for (let i = 1; i <= runCount; i++) {
            console.log(`\n\n--- Bắt đầu lần chạy thứ ${i}/${runCount} ---`);
            try {
                // Điều hướng về trang chủ để reset trạng thái
                window.location.href = 'https://app.klingai.com/global';
                await new Promise(r => setTimeout(r, 5000)); // Chờ trang chủ tải xong

                await runFlow(followLink);
                console.log(`✅ Hoàn thành lần chạy thứ ${i}`);
            } catch (err) {
                console.error(`❌ Lỗi ở lần chạy thứ ${i}:`, err);
                alert(`Lỗi ở lần chạy ${i}. Vui lòng kiểm tra Console (F12) để biết chi tiết. Script sẽ dừng lại.`);
                break;
            }
            if (i < runCount) {
                console.log(`⏳ Chuẩn bị cho lần chạy tiếp theo...`);
            }
        }
        console.log("🎉 Đã hoàn thành tất cả các lần chạy!");
        alert("🎉 Đã hoàn thành tất cả các lần chạy!");
    }

    // Bắt đầu chạy chương trình
    try {
        await main();
    } catch (err) {
        console.error("❌ Script gặp lỗi không mong muốn:", err);
        alert("Script gặp lỗi không mong muốn. Vui lòng kiểm tra Console (F12).");
    }
})();
