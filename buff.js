(async () => {
    // =================================================================
    // Đã cập nhật URL Vercel của bạn
    // =================================================================
    const YOUR_VERCEL_APP_URL = 'https://kling-api-proxy.vercel.app';
    // =================================================================

    console.log("🚀 Script tự động hóa Kling Bắt đầu...");

    function generatePassword(length = 10) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    async function fetchEmail() {
        const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/create-email`, { method: 'POST' });
        if (!res.ok) throw new Error("Không thể gọi API create-email trên Vercel.");
        const json = await res.json();
        console.log(`✅ Lấy email thành công: ${json.email}`);
        return { email: json.email };
    }

    async function fetchVerificationCode(email) {
        console.log(`⏳ Đang tìm mã xác minh cho ${email}...`);
        for (let i = 0; i < 30; i++) { // Thử trong 60 giây
            try {
                const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/check-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
                const json = await res.json();
                if (json && json.text) {
                    const match = json.text.match(/\b\d{6}\b/);
                    if (match) {
                        console.log(`✅ Tìm thấy mã: ${match[0]}`);
                        return match[0];
                    }
                }
                await new Promise(r => setTimeout(r, 2000));
            } catch (err) {
                console.error("Lỗi khi gọi check-email:", err);
            }
        }
        console.warn("⚠️ Hết thời gian chờ, không tìm thấy mã xác minh.");
        return null;
    }

    async function waitForElement(selector, timeout = 15000) {
        return new Promise((resolve, reject) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            const observer = new MutationObserver(() => {
                const foundEl = document.querySelector(selector);
                if (foundEl) {
                    observer.disconnect();
                    resolve(foundEl);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout chờ phần tử: ${selector}`));
            }, timeout);
        });
    }

    async function runFlow(followLink) {
        try {
            const { email } = await fetchEmail();
            const password = generatePassword();
            console.log("📧 Email:", email, "| 🔐 Password:", password);

            await waitForElement('div.login').then(el => el.click());
            console.log("➡️ Click Sign In");

            await new Promise(r => setTimeout(r, 1000));
            await waitForElement('div.sign-in-button[style*="margin-top: 24px"]').then(el => el.click());
            console.log("➡️ Click Sign in with Email");

            await waitForElement('p.clickable a').then(el => el.click());
            console.log("➡️ Click Sign up for free");

            const emailInput = await waitForElement('input[placeholder="Enter Email Address"]');
            const passInput = await waitForElement('input[placeholder="Password (at least 8 characters)"]');
            const confirmInput = await waitForElement('input[placeholder="Confirm Password"]');
            
            emailInput.value = email;
            passInput.value = password;
            confirmInput.value = password;
            [emailInput, passInput, confirmInput].forEach(input => input.dispatchEvent(new Event('input', { bubbles: true })));

            await waitForElement('.generic-button.critical.large').then(el => el.click());
            console.log("➡️ Đã click Next, chờ captcha (nếu có)...");

            await new Promise(r => setTimeout(r, 8000)); // Chờ xử lý captcha

            const codeInput = await waitForElement('input[placeholder="Verification Code"]');
            const code = await fetchVerificationCode(email);
            if (!code) {
                throw new Error("Không thể lấy mã xác minh tự động.");
            }

            codeInput.value = code;
            codeInput.dispatchEvent(new Event('input', { bubbles: true }));

            await waitForElement('button.generic-button.critical.large:not(:disabled)').then(el => el.click());
            console.log("✅ Hoàn tất đăng ký!");

            await new Promise(r => setTimeout(r, 2000));
            console.log(`🌐 Đang vào link follow: ${followLink}`);
            window.location.href = followLink;
            await new Promise(r => setTimeout(r, 5000)); 

            await waitForElement('button.follow-button').then(el => el.click());
            console.log("✅ Đã nhấn nút Follow.");

            console.log("🌐 Đăng xuất...");
            window.location.href = 'https://app.klingai.com/global/account/sign-out';
            await new Promise(r => setTimeout(r, 3000));

        } catch (err) {
            console.error("❌ Flow thất bại:", err);
            throw err;
        }
    }

    async function main() {
        const followLink = prompt("Nhập link buff follow (ví dụ: https://app.klingai.com/global/user-home/7054579/all):");
        if (!followLink || !followLink.startsWith('https://app.klingai.com/')) return alert("❌ Link không hợp lệ.");

        const runCount = parseInt(prompt("Nhập số lần chạy:"));
        if (isNaN(runCount) || runCount <= 0) return alert("❌ Số lần chạy không hợp lệ.");

        console.log(`🔄 Sẽ chạy ${runCount} lần với link: ${followLink}`);

        for (let i = 1; i <= runCount; i++) {
            console.log(`\n--- Bắt đầu lần chạy ${i}/${runCount} ---`);
            try {
                window.location.href = 'https://app.klingai.com/global';
                await new Promise(r => setTimeout(r, 5000));
                await runFlow(followLink);
                console.log(`✅ Hoàn thành lần chạy ${i}.`);
            } catch (err) {
                alert(`Lỗi ở lần chạy ${i}: ${err.message}. Script sẽ dừng lại.`);
                break;
            }
            if (i < runCount) {
                console.log(`⏳ Chuẩn bị cho lần chạy tiếp theo...`);
            }
        }
        alert("🎉 Đã hoàn thành tất cả các lần chạy!");
    }

    await main();
})();
