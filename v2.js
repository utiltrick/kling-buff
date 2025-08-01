// ===================================================================================
// == SCRIPT TỰ ĐỘNG THÔNG MINH KLING AI (v2 - Đã sửa Step 1) ==
// Dán 1 lần duy nhất, sau đó dùng lệnh startAutomation() và stopAutomation()
// ===================================================================================

// --- CÁC HÀM TIỆN ÍCH ---
const YOUR_VERCEL_APP_URL = 'https://kling-api-proxy.vercel.app';
function generatePassword(length = 10) { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"; let p = ""; for (let i = 0; i < length; i++) { p += chars.charAt(Math.floor(Math.random() * chars.length)); } return p; }
async function findButtonByText(text) { console.log(`Tìm nút: "${text}"`); await new Promise(r => setTimeout(r, 2000)); const allButtons = document.querySelectorAll('button'); for (const btn of allButtons) { if (btn.textContent.trim().includes(text)) { console.log(`✅ Thấy nút: "${text}"`); return btn; } } throw new Error(`Không thấy nút: "${text}"`); }
async function fetchEmail() { const r = await fetch(`${YOUR_VERCEL_APP_URL}/api/create-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }); if (!r.ok) throw new Error("Lỗi API create-email"); const j = await r.json(); if (!j.email) throw new Error("API không trả về email."); return j; }
async function fetchVerificationCode(email) { for (let i = 0; i < 30; i++) { try { const r = await fetch(`${YOUR_VERCEL_APP_URL}/api/check-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); if (r.ok) { const j = await r.json(); if (j && j.text) { const m = j.text.match(/\b\d{6}\b/); if (m) return m[0]; } } } catch (e) {} await new Promise(r => setTimeout(r, 2000)); } throw new Error("Không lấy được mã xác minh."); }
async function waitForElement(selector, timeout = 20000) { return new Promise((resolve, reject) => { const i = setInterval(() => { const el = document.querySelector(selector); if (el) { clearInterval(i); clearTimeout(t); resolve(el); } }, 500); const t = setTimeout(() => { clearInterval(i); reject(new Error(`Timeout: ${selector}`)); }, timeout); }); }
async function waitForCaptcha(timeout = 30000) { return new Promise((resolve) => { const i = setInterval(() => { if (!document.querySelector('.kwai-captcha-slider-wrapper')) { clearInterval(i); clearTimeout(t); resolve(); } }, 500); const t = setTimeout(() => { clearInterval(i); resolve(); }, timeout); }); }

// --- HÀM ĐIỀU KHIỂN ---
function startAutomation(followLink) {
    if (!followLink || !followLink.startsWith('https://app.klingai.com/')) {
        console.error("❌ Link follow không hợp lệ!");
        return;
    }
    console.log("🚀 Bắt đầu chu trình tự động...");
    localStorage.setItem('kling_follow_link', followLink);
    localStorage.setItem('kling_automation_step', 'REGISTER');
    // Chuyển đến trang chủ để bắt đầu nếu chưa ở đó
    if (!window.location.href.endsWith('/global/')) {
        window.location.href = 'https://app.klingai.com/global/';
    } else {
        window.location.reload(); // Tải lại để kích hoạt script
    }
}

function stopAutomation() {
    localStorage.removeItem('kling_follow_link');
    localStorage.removeItem('kling_automation_step');
    console.log("🛑 Đã dừng chu trình tự động. Mọi hoạt động sẽ ngừng ở trang tiếp theo.");
}

// --- LOGIC TỰ ĐỘNG CHẠY MỖI KHI TẢI TRANG ---
(async () => {
    const step = localStorage.getItem('kling_automation_step');
    const followLink = localStorage.getItem('kling_follow_link');

    if (!step) { return; }

    console.log(`🤖 Trạng thái hiện tại: ${step}`);

    try {
        switch (step) {
            case 'REGISTER':
                console.log("--- Bước 1: Đăng ký ---");
                const { email } = await fetchEmail();
                const password = generatePassword();
                console.log(`... Dùng email: ${email}`);

                // 1. Nhấp vào nút/div Đăng nhập chính ở trang chủ
                (await waitForElement('div.login')).click();
                await new Promise(r => setTimeout(r, 1500));

                // 2. Nhấp vào "Sign in with email"
                (await findButtonByText('Sign in with email')).click();
                await new Promise(r => setTimeout(r, 1500));

                // 3. Nhấp vào link "Sign up for free"
                (await waitForElement('p.clickable a')).click();

                // 4. Điền thông tin vào form
                const emailInput = await waitForElement('input[placeholder="Enter Email Address"]');
                const passInput = await waitForElement('input[placeholder="Password (at least 8 characters)"]');
                const confirmInput = await waitForElement('input[placeholder="Confirm Password"]');
                emailInput.value = email;
                passInput.value = password;
                confirmInput.value = password;
                [emailInput, passInput, confirmInput].forEach(input => input.dispatchEvent(new Event('input', { bubbles: true })));
                
                // 5. Nhấp vào nút Next
                (await findButtonByText('Next')).click();

                // 6. Chờ xử lý captcha (nếu có)
                await waitForCaptcha(30000);

                // 7. Điền mã xác minh
                const code = await fetchVerificationCode(email);
                const codeInput = await waitForElement('input[placeholder="Verification Code"]', 60000);
                codeInput.value = code;
                codeInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                // 8. Hoàn tất đăng ký bằng cách nhấn vào nút cuối cùng
                const finalSubmitButton = await waitForElement('button.generic-button.critical.large:not([disabled])');
                finalSubmitButton.click();

                console.log("✅ Đăng ký thành công!");
                localStorage.setItem('kling_automation_step', 'FOLLOW');
                await new Promise(r => setTimeout(r, 4000));
                window.location.href = followLink;
                break;

            case 'FOLLOW':
                console.log("--- Bước 2: Follow ---");
                (await findButtonByText('Follow')).click();
                console.log("✅ Đã Follow!");
                localStorage.setItem('kling_automation_step', 'SIGNOUT');
                await new Promise(r => setTimeout(r, 3000));
                window.location.href = 'https://app.klingai.com/global/account';
                break;

            case 'SIGNOUT':
                console.log("--- Bước 3: Đăng xuất ---");
                // Thử tìm và nhấn nút "Sign Out" trực tiếp
                try {
                    const signOutBtn = await findButtonByText('Sign Out');
                    signOutBtn.click();
                } catch (e) {
                    // Nếu không thấy, có thể nó bị ẩn sau nút "Profile Settings"
                    console.log('Không thấy nút "Sign Out", thử tìm "Profile Settings"...');
                    (await findButtonByText('Profile Settings')).click();
                    (await findButtonByText('Sign Out')).click();
                }
                console.log("✅ Đã Đăng xuất! Hoàn thành chu trình.");
                stopAutomation(); // Xóa trạng thái để kết thúc
                await new Promise(r => setTimeout(r, 3000));
                window.location.href = 'https://app.klingai.com/global/';
                break;
        }
    } catch (err) {
        console.error(`❌ Lỗi ở bước ${step}:`, err);
        stopAutomation(); // Dừng lại nếu có lỗi
    }
})();
