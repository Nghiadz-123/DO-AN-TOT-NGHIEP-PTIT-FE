const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="footer">
      <p>© {YEAR} Smart ATS </p>
    </footer>
  )
}
