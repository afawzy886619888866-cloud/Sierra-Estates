---
description: Tự động cập nhật phiên bản và đồng bộ toàn bộ tài liệu hệ thống
---

# /release - Quy trình Phát hành Phiên bản Tự động

Workflow này sử dụng "Auto-Release Engine" để đảm bảo mọi phiên bản mới đều được đồng bộ chính xác 100% trên toàn bộ hệ thống file.

## 📋 Khi nào sử dụng

- Khi bạn muốn tăng version (ví dụ: `4.0.3` -> `4.0.4`).
- Khi bạn muốn đảm bảo số lượng Skills/Workflows trong README là chính xác nhất.
- Trước khi push code lên Git.

## ⚙️ Quy trình thực hiện

### Bước 1: Xác định phiên bản mới

Xác định số phiên bản tiếp theo theo chuẩn Semantic Versioning (Major.Minor.Patch).

### Bước 2: Chạy Auto-Release Engine

// turbo
Agent sẽ chạy lệnh sau (thay `<version>` bằng số phiên bản mới):

```bash
node .agent/scripts/auto-release.js <version>
```

**Script này sẽ tự động:**

1. ✅ Tìm và thay thế version cũ trong `package.json`, `VERSION`, `MASTER_GUIDE.md`.
2. ✅ Đếm lại toàn bộ Skills, Workflows, Rules, Agents trong hệ thống thực tế.
3. ✅ Cập nhật con số chính xác vào `README.md`, `README.vi.md`, `SKILLS.md`.
4. ✅ Quét các file mới (A) trong Git để liệt kê các tính năng vừa làm.

### Bước 3: Cập nhật Changelog (Thủ công một phần)

Script sẽ in ra danh sách các file mới. Dựa vào đó, Agent sẽ cập nhật file `CHANGELOG.md`:

- Copy danh sách tính năng mới vào mục `### Added`.
- Ghi chú các thay đổi quan trọng.

### Bước 4: Review & Commit

Sau khi script chạy xong, Agent thực hiện:

1. Kiểm tra lại `git diff` để chắc chắn mọi thứ đúng ý.
2. Commit với message chuẩn: `release: v<version>`.
3. Tạo Tag và Push.

## 💡 Ví dụ

> **User**: "Release bản 4.1.0 cho tớ"
>
> **Agent**:
>
> 1. Chạy `node .agent/scripts/auto-release.js 4.1.0`
> 2. Script báo: "Updated 4 files. Stats synced: 28 Skills."
> 3. List feature mới: `malware-analyst`, `/release`.
> 4. Agent thêm vào CHANGELOG.md.
> 5. Commit & Push.

---
**Lợi ích**: Không bao giờ quên sửa version ở một file ẩn nào đó nữa!
