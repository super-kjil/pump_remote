import { Link } from 'react-router-dom'

export default function NavFooter() {
  return (
    <>
      <footer className="border-t border-border/70 bg-muted/20">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link className="font-medium text-foreground" to="/">The Good Store</Link>
          <span>Thoughtful finds for everyday living.</span>
          <span>© {new Date().getFullYear()} The Good Store</span>
        </div>
      </footer>
    </>
  )
}
