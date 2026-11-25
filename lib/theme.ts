export const THEME_KEY = "webhook-inspector:theme";

/**
 * Chạy trước khi trang hiển thị để tránh nháy sai màu:
 * dùng theme đã lưu, nếu chưa có thì theo hệ điều hành.
 */
export const themeInitScript = `(function(){try{
var k=${JSON.stringify(THEME_KEY)};
var m=window.matchMedia("(prefers-color-scheme: dark)");
function apply(){var s=localStorage.getItem(k);var d=s?s==="dark":m.matches;document.documentElement.classList.toggle("dark",d);}
apply();
m.addEventListener("change",function(){if(!localStorage.getItem(k))apply();});
}catch(e){}})();`;
