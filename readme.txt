Tạo một trang web dịch ngôn ngữ tự động hoàn chỉnh và hoạt động ổn định.

Yêu cầu chức năng:

* Ô textarea nhập văn bản cần dịch
* Dropdown chọn ngôn ngữ nguồn (có Auto detect)
* Dropdown chọn ngôn ngữ đích
* Nút "Translate"
* Ô textarea hiển thị kết quả dịch
* Nút hoán đổi ngôn ngữ (↔)
* Nút copy kết quả
* Hiển thị loading khi đang dịch
* Hiển thị lỗi nếu API không phản hồi
* Phím tắt Ctrl + Enter để dịch
* Hỗ trợ ít nhất các ngôn ngữ:

  * English (en)
  * Vietnamese (vi)
  * Japanese (ja)
  * Korean (ko)
  * Chinese (zh)
  * French (fr)
  * German (de)
  * Spanish (es)
  * Russian (ru)
  * Thai (th)

Giao diện:

* Sử dụng TailwindCSS CDN
* UI căn giữa màn hình
* Responsive mobile + desktop
* Có dark mode toggle
* Giao diện sạch và hiện đại

API dịch:

* Sử dụng LibreTranslate public instance:
  https://translate.argosopentech.com/translate

Cấu hình fetch:

* Method: POST
* Headers:
  Content-Type: application/json
* Body JSON:
  {
  "q": "text",
  "source": "auto",
  "target": "vi",
  "format": "text"
  }

Yêu cầu kỹ thuật:

* Viết toàn bộ trong 1 file HTML duy nhất
* Dùng JavaScript thuần (không framework)
* Không cần backend
* Xử lý lỗi API
* Kiểm tra input rỗng
* Hiển thị spinner loading
* Code có comment giải thích

Output mong muốn:

* Trả về 1 file index.html hoàn chỉnh
* Chạy trực tiếp bằng Live Server
* Không lỗi CSS
* Dịch hoạt động ngay
* UI đẹp và dễ dùng

*** Đề Xuất nâng cấp lần 1 ***
* Đã triển khai lần 1: thêm nút "Clear" để xóa nhanh cả ô nhập, ô kết quả và reset thông báo lỗi.

*** Đề Xuất nâng cấp lần 2 ***
Thêm các tính năng sau:

Translation History
Lưu 10 câu đã dịch gần nhất
Hiển thị danh sách phía dưới
Click vào để dùng lại
Có nút clear history
Lưu bằng localStorage
Text-to-Speech
Nút 🔊 cho input
Nút 🔊 cho output
Dùng Web Speech API
Chọn giọng theo ngôn ngữ
Auto Translate
Khi người dùng dừng gõ 1 giây thì tự dịch
Không gọi API liên tục
Dùng debounce
Character Counter
Hiển thị số ký tự input
Giới hạn 5000 ký tự

**Yêu cầu:

Không phá layout hiện tại
Giữ TailwindCSS
Code gọn gàng
Không thêm thư viện ngoài

 *** Đề Xuất nâng cấp lần 3 ***

Thêm các tính năng nâng cao sau:

1. Retry + Send Again

* Khi API fail hiển thị nút Retry
* Giữ nguyên input và ngôn ngữ
* Click retry gọi lại API

2. Auto Translate Toggle

* Toggle bật/tắt auto translate
* Nút Pause khi đang auto
* Debounce 800ms

3. Translation Cache

* Cache theo key: text + source + target
* Lưu trong localStorage
* Nếu có cache → dùng luôn
* Hiển thị "from cache"

4. Detected Language

* Khi source = auto
* Hiển thị ngôn ngữ detect
* Không lỗi nếu API không trả

5. Advanced History

* Nút Use
* Nút Delete
* Hiển thị timestamp
* Sort theo newest
* Filter theo ngôn ngữ

6. Advanced TTS

* Chọn rate
* Chọn pitch
* Fallback nếu không có voice

7. Abort Request

* Dùng AbortController
* Hủy request cũ khi text thay đổi

8. UX Improvements

* Highlight kết quả mới
* Toast khi copy
* Toast khi lỗi
* Toast khi cache hit

Yêu cầu:

* Không phá layout
* TailwindCSS
* JavaScript thuần
* Code modular
* Comment rõ ràng

*** Đề Xuất nâng cấp lần 4 ***

Thêm các tính năng nâng cao:

1. Voice Input

* Nút microphone
* Dùng Web Speech API
* Nhận diện giọng nói
* Đưa text vào input
* Auto translate khi bật auto mode

2. Upload File

* Upload file .txt
* Đọc nội dung
* Đưa vào input
* Giữ xuống dòng

3. Download Result

* Nút download
* Xuất file translated.txt
* UTF-8 encoding

4. Favorites

* Nút star mỗi bản dịch
* Lưu localStorage
* Tab favorites riêng
* Nút use lại

5. Detect Language Realtime

* Hiển thị language detect khi gõ
* Update realtime

Yêu cầu:

* Không phá layout hiện tại
* TailwindCSS
* JavaScript thuần
* Code modular
* Comment rõ ràng

*** Đề Xuất nâng cấp lần 5 ***

Nâng cấp hệ thống Text-to-Speech để cải thiện giọng đọc tiếng Việt và các ngôn ngữ khác.

Yêu cầu:

1. Ưu tiên chọn voice chính xác theo mã ngôn ngữ

* Exact match trước (vi-VN)
* Sau đó prefix match (vi)
* Sau đó fallback English

2. Khi chọn voice

* Phải set cả utter.voice và utter.lang
* Tránh trường hợp voice tiếng Anh đọc tiếng Việt

3. Load voices bất đồng bộ

* Sử dụng speechSynthesis.onvoiceschanged
* Cache voices vào biến toàn cục

4. Thêm UI chọn giọng (Voice selector)

* Dropdown hiển thị danh sách voice theo ngôn ngữ
* Cho phép user override voice auto

5. Thêm tùy chỉnh TTS nâng cao

* Rate slider (0.5 → 1.5)
* Pitch slider (0.5 → 1.5)
* Volume slider (0 → 1)

6. Fallback logic

* Nếu không có voice ngôn ngữ
* Hiển thị warning "Voice not available"
* Dùng voice English nhưng vẫn set lang

7. Debug mode (optional)

* Console log danh sách voices
* Hiển thị voice đang sử dụng

8. UX

* Nút Play / Pause / Stop
* Highlight text đang đọc (optional)
* Disable khi đang loading

* Đã triển khai lần 5: cache voices + onvoiceschanged, chọn voice exact/prefix/en fallback, utter.voice + utter.lang, dropdown giọng nguồn/đích, volume 0–1, Pause/Resume/Replay + Stop, cảnh báo Voice not available, debug checkbox + voice đang dùng, highlight boundary khi đọc, khóa TTS khi đang dịch.

Yêu cầu kỹ thuật:

* JavaScript thuần
* Không framework
* Không phá layout hiện tại
* Compatible Chrome / Edge
* Có comment giải thích

*** đề xuất nâng cấp lần 6 ***

Thêm các tính năng độc đáo:

1. OCR Translate

* Upload image
* Extract text
* Auto translate
* Preview ảnh

2. Hover Translate

* ALT + hover text
* Popup mini translation
* Auto hide

3. Conversation Mode

* 2 microphone buttons
* Translate 2 chiều
* Auto detect speaker

4. Floating Mini Translator

* Button nổi góc phải
* Popup nhỏ
* Dịch nhanh

5. Highlight Translate

* Detect text selection
* Show translate button
* Inline result

Yêu cầu:

* Không phá layout chính
* TailwindCSS
* JavaScript thuần
* Modular code
* Optional toggle enable

*** Fix lỗi  ***

Mô tả lỗi:

1. Khi tắt Auto Translate và bấm Translate → không hoạt động hoặc lỗi
2. Talk (Speech Recognition / TTS) không hoạt động trên một số trình duyệt
3. TextDetector API không tồn tại trên trình duyệt → OCR bị crash

Yêu cầu sửa:

====================

1. Fix Auto Translate OFF
   ====================

* Khi Auto Translate OFF
* Nút Translate phải gọi trực tiếp hàm translate()
* Không phụ thuộc debounce hoặc auto trigger
* Không dùng state cũ

Đảm bảo:

if (!autoTranslate) {
translate();
}

* Không return sớm khi autoTranslate = false
* Luôn lấy sourceLang.value và targetLang.value khi bấm Translate

====================
2. Fix Talk fallback (Speech API)
=================================

* Kiểm tra hỗ trợ trước khi dùng:

const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
showError("Trình duyệt không hỗ trợ Speech Recognition");
disableTalkButton();
}

* Kiểm tra TTS:

if (!("speechSynthesis" in window)) {
disableTTS();
}

* Không crash nếu API không tồn tại
* Hiển thị toast warning

====================
3. Fix TextDetector unsupported
===============================

* Kiểm tra trước khi dùng:

if ("TextDetector" in window) {
// dùng native OCR
} else {
// fallback OCR API ngoài
}

====================
4. Fallback OCR ngoài
=====================

* Dùng API OCR bên ngoài nếu TextDetector không có
* Ví dụ:

  * Tesseract.js
  * OCR.space API
* Không làm crash nếu offline

====================
5. Graceful degradation
=======================

* Nếu Talk không hỗ trợ → disable button
* Nếu OCR không hỗ trợ → hide feature
* Nếu Auto translate OFF → manual translate vẫn hoạt động

====================
6. UX yêu cầu
=============

* Show warning nhẹ (không alert)
* Disable button không hỗ trợ
* Tooltip: "Not supported on this browser"

====================
7. Yêu cầu kỹ thuật
===================

* JavaScript thuần
* Không phá layout
* Không throw error
* Compatible Chrome / Edge / Firefox
* Có comment giải thích

** Nâng cấp lần 7 **

* Không sử dụng TextDetector API vì trình duyệt không hỗ trợ.
* Thay thế bằng thư viện Tesseract.js CDN.
* Thêm input upload ảnh để nhận diện chữ.
* Khi chọn ảnh, hiển thị trạng thái "Đang nhận diện..."
* Sau khi OCR xong, tự động đưa text vào textarea source.
* Hỗ trợ tiếng Việt và tiếng Anh ("vie+eng").
* Xử lý lỗi khi người dùng không chọn ảnh.
* Không dùng React, chỉ HTML + JavaScript thuần.
* Giữ nguyên UI hiện tại.
* Thêm console.log để debug tiến trình OCR.

*** Fix lỗi "Fetch API cannot load blob URL" khi dùng Tesseract.js OCR.

* Không sử dụng URL.createObjectURL(file)
* Truyền trực tiếp File object vào Tesseract.recognize
* Thêm try/catch để bắt lỗi OCR
* Hiển thị lỗi thân thiện khi OCR fail
* Log tiến trình logger ra console
* Không thay đổi UI hiện tại
* Dùng HTML + JavaScript thuần
* Hỗ trợ ngôn ngữ "vie+eng"

Implement advanced Auto Language Detection system.

Features:

* Detect language locally using regex heuristics (Vietnamese, English, Chinese)
* If uncertain, call translation API with fallback source
* Extract detected language from API response
* Display detected language in UI
* Skip translation if source === target
* Add retry mechanism when AUTO fails
* Cache detected results
* Add debounce for auto translate
* Add console debug logs
* Maintain existing UI
* Use vanilla JavaScript

