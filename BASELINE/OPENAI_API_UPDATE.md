# Cập nhật OpenAI API mới

## Thay đổi chính

Code đã được cập nhật để hỗ trợ OpenAI API mới (openai >= 1.0.0):

### 1. File `opro/prompt_utils.py`
- ✅ Thay `openai.ChatCompletion.create()` → `client.chat.completions.create()`
- ✅ Thay `max_completion_tokens` → `max_tokens`
- ✅ Cập nhật exception handling (VD: `openai.error.RateLimitError` → `openai.RateLimitError`)
- ✅ Thêm function `init_openai_client()` để khởi tạo client

### 2. File `opro/optimization/optimize_linear_regression.py`
- ✅ Xóa model không tồn tại `gpt-5-nano`
- ✅ Thêm danh sách các model hợp lệ:
  - OpenAI: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`, `gpt-4o`, `gpt-4o-mini`
  - PaLM: `text-bison`
- ✅ Thêm validation để kiểm tra model có hợp lệ không
- ✅ Cải thiện error handling khi gọi API

## Cách sử dụng

### 1. Cài đặt phiên bản OpenAI mới
```cmd
pip install --upgrade openai
```

### 2. Chạy script với model hợp lệ

**GPT-3.5 Turbo (rẻ nhất):**
```cmd
python opro\optimization\optimize_linear_regression.py --optimizer="gpt-3.5-turbo" --openai_api_key="YOUR_API_KEY"
```

**GPT-4:**
```cmd
python opro\optimization\optimize_linear_regression.py --optimizer="gpt-4" --openai_api_key="YOUR_API_KEY"
```

**GPT-4 Turbo:**
```cmd
python opro\optimization\optimize_linear_regression.py --optimizer="gpt-4-turbo" --openai_api_key="YOUR_API_KEY"
```

**GPT-4o (model mới nhất):**
```cmd
python opro\optimization\optimize_linear_regression.py --optimizer="gpt-4o" --openai_api_key="YOUR_API_KEY"
```

**GPT-4o Mini (cân bằng giữa giá và hiệu suất):**
```cmd
python opro\optimization\optimize_linear_regression.py --optimizer="gpt-4o-mini" --openai_api_key="YOUR_API_KEY"
```

### 3. Với PaLM (Google)
```cmd
python opro\optimization\optimize_linear_regression.py --optimizer="text-bison" --palm_api_key="YOUR_PALM_KEY"
```

## Lỗi thường gặp

### ❌ Model không tồn tại
```
AssertionError: Model 'gpt-5-nano' is not supported.
```
**Giải pháp:** Sử dụng một trong các model hợp lệ được liệt kê ở trên.

### ❌ API key không được cung cấp
```
AssertionError: The OpenAI API key must be provided.
```
**Giải pháp:** Thêm `--openai_api_key="YOUR_KEY"` vào command.

### ❌ Rate limit exceeded
```
Rate limit exceeded. Retrying in 30 seconds...
```
**Giải pháp:** Code sẽ tự động retry. Hoặc chờ một chút rồi chạy lại.

## So sánh các model OpenAI

| Model | Giá (Input/Output) | Tốc độ | Khuyên dùng cho |
|-------|-------------------|--------|-----------------|
| gpt-3.5-turbo | Rẻ nhất | Nhanh nhất | Testing, prototype |
| gpt-4o-mini | Rẻ | Nhanh | Production, cân bằng |
| gpt-4o | Trung bình | Nhanh | Tasks phức tạp |
| gpt-4-turbo | Đắt | Trung bình | Tasks rất phức tạp |
| gpt-4 | Đắt nhất | Chậm nhất | Chất lượng cao nhất |

## Debug

Nếu vẫn gặp vấn đề với `raw_outputs` trả về rỗng:

1. Kiểm tra API key có đúng không
2. Kiểm tra kết nối internet
3. Xem log để tìm error message cụ thể
4. Kiểm tra credit/quota của OpenAI account

## Changelog

- **2025-11-19**: Cập nhật từ OpenAI API cũ sang API mới
- Loại bỏ model không tồn tại `gpt-5-nano`
- Thêm validation cho model names
- Cải thiện error handling
