"""Sinh file CV dùng cho test (không phụ thuộc file mẫu ngoài project).

Backend (BE/backend/apps/cvs/validators.py) nhận diện định dạng theo NỘI DUNG file và từ chối file trùng
nội dung (SHA-256) với CV đang có của cùng ứng viên -> mọi file sinh ra đều chứa chuỗi duy nhất.
Bóc tách văn bản: PDF dùng pypdf, DOCX đọc word/document.xml; ít hơn 30 ký tự chữ -> parse_status=failed.
"""
from __future__ import annotations

import io
import zipfile
from dataclasses import dataclass

from utils.helpers import unique_suffix

PDF_MIME = "application/pdf"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
MB = 1024 * 1024


@dataclass(frozen=True)
class CvFile:
    name: str
    mime: str
    content: bytes

    @property
    def size(self) -> int:
        return len(self.content)

    def payload(self) -> dict:
        """Dạng dùng cho locator.set_input_files() và multipart của APIRequestContext."""
        return {"name": self.name, "mimeType": self.mime, "buffer": self.content}


# ---------------------------------------------------------------- nội dung CV mẫu
def cv_lines(tag: str | None = None, *, with_contact: bool = True) -> list[str]:
    tag = tag or unique_suffix()
    lines = [
        "NGUYEN VAN AUTO",
        "Sales Executive",
    ]
    if with_contact:
        lines.append("Email: auto.cv@example.com | Phone: 0912345678")
    lines += [
        "SUMMARY",
        "Sales executive with 3 years of B2B experience, consistently exceeding quarterly targets.",
        "EXPERIENCE",
        "Sales Executive - ABC Trading (06/2023 - Present)",
        "Managed 40 key accounts and grew revenue by 25 percent.",
        "EDUCATION",
        "Bachelor of Business Administration - National Economics University (2016 - 2020)",
        "SKILLS",
        "Sales, Negotiation, Excel, Communication, CRM",
        f"Ref: {tag}",
    ]
    return lines


# ---------------------------------------------------------------- PDF
def _pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(lines: list[str], *, pad_to: int | None = None) -> bytes:
    """PDF 1 trang, font Helvetica (chỉ ASCII). pad_to: thêm object đệm để file có đúng số byte."""
    ops = ["BT", "/F1 11 Tf", "14 TL", "50 800 Td"]
    for line in lines:
        ops += [f"({_pdf_escape(line)}) Tj", "T*"]
    ops.append("ET")
    stream = "\n".join(ops).encode("latin-1")

    def build(pad_len: int | None) -> bytes:
        objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        ]
        if pad_len is not None:
            objects.append(b"<< /Length %d >>\nstream\n" % pad_len + b"0" * pad_len + b"\nendstream")
        out = io.BytesIO()
        out.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = []
        for i, body in enumerate(objects, start=1):
            offsets.append(out.tell())
            out.write(b"%d 0 obj\n" % i + body + b"\nendobj\n")
        xref = out.tell()
        out.write(b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1))
        for off in offsets:
            out.write(b"%010d 00000 n \n" % off)
        out.write(b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref))
        return out.getvalue()

    if pad_to is None:
        return build(None)
    pad = max(pad_to - len(build(0)), 0)
    for _ in range(5):  # số chữ số của Length/offset thay đổi -> chỉnh vài lần cho khớp đúng byte
        data = build(pad)
        if len(data) == pad_to:
            return data
        pad += pad_to - len(data)
    raise ValueError(f"Không tạo được PDF đúng {pad_to} byte")


def pdf_cv(name: str | None = None, *, tag: str | None = None, with_contact: bool = True,
           pad_to: int | None = None) -> CvFile:
    tag = tag or unique_suffix()
    return CvFile(name or f"CV_Auto_{tag}.pdf", PDF_MIME, make_pdf(cv_lines(tag, with_contact=with_contact), pad_to=pad_to))


def pdf_without_text(name: str | None = None) -> CvFile:
    """PDF hợp lệ nhưng gần như không có chữ (giống CV dạng ảnh) -> backend báo không đọc được."""
    tag = unique_suffix()
    return CvFile(name or f"CV_Scan_{tag}.pdf", PDF_MIME, make_pdf([tag[-6:]]))


# ---------------------------------------------------------------- DOCX
_DOCX_CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" '
    'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    "</Types>"
)
_DOCX_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
    'officeDocument" Target="word/document.xml"/></Relationships>'
)


def _xml_escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def make_docx(paragraphs: list[str]) -> bytes:
    body = "".join(f'<w:p><w:r><w:t xml:space="preserve">{_xml_escape(p)}</w:t></w:r></w:p>' for p in paragraphs)
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}</w:body></w:document>"
    )
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", _DOCX_CONTENT_TYPES)
        z.writestr("_rels/.rels", _DOCX_RELS)
        z.writestr("word/document.xml", document)
    return out.getvalue()


def docx_cv(name: str | None = None, *, tag: str | None = None) -> CvFile:
    tag = tag or unique_suffix()
    lines = cv_lines(tag)
    lines[0] = "NGUYỄN VĂN TỰ ĐỘNG"
    lines[1] = "Nhân viên kinh doanh"
    return CvFile(name or f"CV_Auto_{tag}.docx", DOCX_MIME, make_docx(lines))


# ---------------------------------------------------------------- file không hợp lệ
def _zip(entries: dict[str, str]) -> bytes:
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as z:
        for name, text in entries.items():
            z.writestr(name, text)
    return out.getvalue()


def invalid_files() -> dict[str, CvFile]:
    """File sai định dạng theo phần mở rộng (Candidate_52)."""
    tag = unique_suffix()
    return {
        "exe": CvFile(f"setup_{tag}.exe", "application/x-msdownload", b"MZ\x90\x00" + tag.encode() + b"\x00" * 64),
        "txt": CvFile(f"cv_{tag}.txt", "text/plain", "\n".join(cv_lines(tag)).encode()),
        "xlsx": CvFile(f"cv_{tag}.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                       _zip({"[Content_Types].xml": "<Types/>", "xl/workbook.xml": f"<workbook>{tag}</workbook>"})),
        "zip": CvFile(f"cv_{tag}.zip", "application/zip", _zip({"cv.txt": tag})),
    }


def exe_renamed_as_pdf() -> CvFile:
    """File .exe đổi đuôi thành .pdf (Candidate_53): đúng phần mở rộng, sai nội dung."""
    tag = unique_suffix()
    return CvFile(f"virus_{tag}.pdf", PDF_MIME, b"MZ\x90\x00\x03" + tag.encode() + b"\x00" * 256)


def empty_pdf() -> CvFile:
    return CvFile(f"empty_{unique_suffix()}.pdf", PDF_MIME, b"")


def broken_docx() -> CvFile:
    """Có chữ ký ZIP nhưng nội dung hỏng (Candidate_57)."""
    tag = unique_suffix()
    return CvFile(f"broken_{tag}.docx", DOCX_MIME, b"PK\x03\x04" + tag.encode() + b"\xff" * 128)
