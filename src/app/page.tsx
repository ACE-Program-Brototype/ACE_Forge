import Link from "next/link";
import { RiGraduationCapLine, RiShieldUserLine, RiBookOpenLine, RiRobotLine } from "react-icons/ri";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-outline-variant">
        <div className="max-w-container-max mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl font-bold tracking-tight text-primary">
              ACE <span className="text-accent">FORGE</span>
            </span>
            <span className="badge-ace badge-info text-xs">v1.0</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="btn-secondary text-sm font-medium hover:border-accent"
            >
              Student Portal
            </Link>
            <Link
              href="/admin/login"
              className="btn-primary text-sm font-medium"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-container-max mx-auto px-6 py-16 md:py-24 flex-1 flex flex-col justify-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-soft text-primary rounded-full text-xs font-semibold tracking-wider uppercase mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            ACE Engineering Cohort Platform
          </div>

          <h1 className="headline-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-primary tracking-tight leading-tight mb-6">
            Precision task execution & AI-assisted evaluation.
          </h1>

          <p className="text-secondary text-lg sm:text-xl leading-relaxed mb-10">
            Welcome to <strong>ace_forge</strong>, the dedicated platform for ACE candidates to receive weekly engineering tasks, submit GitHub repository reports, and undergo rigorous automated and employee reviews.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="btn-primary text-base px-8 py-3.5 shadow-md flex items-center gap-3"
            >
              <RiGraduationCapLine className="text-xl text-accent" />
              Enter Student Portal
            </Link>
            <Link
              href="/admin/login"
              className="btn-secondary text-base px-8 py-3.5 flex items-center gap-3"
            >
              <RiShieldUserLine className="text-xl" />
              Enter Admin Portal
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 sm:mt-24">
          <div className="card-ace p-6 transition-all hover:border-outline-strong hover:shadow-md">
            <div className="w-12 h-12 rounded-lg bg-primary-soft text-primary flex items-center justify-center text-2xl mb-4">
              <RiBookOpenLine />
            </div>
            <h3 className="font-serif text-xl font-bold text-primary mb-2">
              Weekly Cohort Modules
            </h3>
            <p className="text-secondary text-sm leading-relaxed">
              Assigned engineering tasks with clear rubrics, due date countdowns, and automated reminders.
            </p>
          </div>

          <div className="card-ace p-6 transition-all hover:border-outline-strong hover:shadow-md">
            <div className="w-12 h-12 rounded-lg bg-accent-container text-on-accent flex items-center justify-center text-2xl mb-4">
              <RiRobotLine />
            </div>
            <h3 className="font-serif text-xl font-bold text-primary mb-2">
              Automated AI Code Review
            </h3>
            <p className="text-secondary text-sm leading-relaxed">
              Instant deep-inspection of GitHub commit histories, code quality, and strict AI-generation verification.
            </p>
          </div>

          <div className="card-ace p-6 transition-all hover:border-outline-strong hover:shadow-md">
            <div className="w-12 h-12 rounded-lg bg-primary-soft text-primary flex items-center justify-center text-2xl mb-4">
              <RiShieldUserLine />
            </div>
            <h3 className="font-serif text-xl font-bold text-primary mb-2">
              Employee Marks & Rubric
            </h3>
            <p className="text-secondary text-sm leading-relaxed">
              Super admins and mentors evaluate student reports, calibrate scores, and maintain confidential feedback.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant bg-white py-6">
        <div className="max-w-container-max mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p>© {new Date().getFullYear()} Advanced Computing Engineers. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Security Protected</span>
            <span>Role-Based Access Control</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
