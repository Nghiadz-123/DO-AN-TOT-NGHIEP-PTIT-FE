// AI chỉ phân tích được CV hệ thống đã đọc được nội dung chữ (parseStatus = completed)
export default function CVNotReady({ cv }) {
  if (cv.parseStatus === 'failed') {
    return (
      <div className="alert alert-error">
        Chưa đọc được nội dung CV này{cv.parseError ? `: ${cv.parseError}` : '.'} AI chỉ phân tích được CV có nội dung
        chữ — hãy tải lên file PDF xuất từ Word / Google Docs hoặc file DOCX.
      </div>
    )
  }
  return <div className="alert alert-info">Hệ thống đang đọc nội dung CV, vui lòng tải lại trang sau ít giây.</div>
}
