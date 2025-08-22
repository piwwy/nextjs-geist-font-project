```markdown
# Detailed Implementation Plan for Alumni Management System

This plan defines the steps and file modifications required to build an alumni management system with local authentication, an XAMPP-backed MySQL database, and priority features for a job board and alumni tracer. The implementation follows best practices for error handling, input validation, and modern UI design using existing shadcn/ui components.

---

## 1. Setup & Dependency Management

- **package.json**  
  - Add dependencies:  
    - "mysql2" (for MySQL connection with XAMPP)  
    - "bcryptjs" (for hashing passwords)  
    - Optionally "cookie" (for managing simple cookie-based sessions)  
  - Example addition in package.json:  
    ```json
    "dependencies": {
      "mysql2": "^2.3.3",
      "bcryptjs": "^2.4.3",
      "cookie": "^0.5.0"
      // ... existing dependencies
    }
    ```
- **.env.local** (new file – not visible in VSCode file list)  
  - Define environment variables:  
    ```
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=
    DB_DATABASE=alumni_db
    ```

---

## 2. Database Connection

- **File:** `src/lib/db.ts`  
  - Create a database connection helper using the mysql2 library and environment variables.  
  - Utilize a connection pool with proper error handling:
    ```typescript
    import mysql from "mysql2/promise";

    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
    });

    export default pool;
    ```

---

## 3. Utility for Password Hashing

- **File:** `src/lib/hash.ts`  
  - Create utilities for hashing and comparing passwords using bcryptjs.
    ```typescript
    import bcrypt from "bcryptjs";

    export async function hashPassword(password: string): Promise<string> {
      const salt = await bcrypt.genSalt(10);
      return bcrypt.hash(password, salt);
    }

    export async function comparePassword(password: string, hash: string): Promise<boolean> {
      return bcrypt.compare(password, hash);
    }
    ```

---

## 4. API Endpoints for Authentication

### a. Registration Endpoint

- **File:** `src/app/api/auth/register/route.ts`  
  - Implement POST method:
    - Extract fields: name, email, password, graduation year, major, etc.
    - Validate input and check if a user already exists.
    - Hash the password and insert user data into the “users” table.
    - Handle and return errors appropriately.
    ```typescript
    import { NextResponse } from "next/server";
    import pool from "@/lib/db";
    import { hashPassword } from "@/lib/hash";

    export async function POST(request: Request) {
      try {
        const { name, email, password, graduationYear, major } = await request.json();

        if (!name || !email || !password) {
          return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const [existing]: any = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
          return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password);
        await pool.query(
          "INSERT INTO users (name, email, password, graduation_year, major) VALUES (?, ?, ?, ?, ?)",
          [name, email, hashedPassword, graduationYear, major]
        );
        
        return NextResponse.json({ message: "Registration successful" }, { status: 201 });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
      }
    }
    ```

### b. Login Endpoint

- **File:** `src/app/api/auth/login/route.ts`  
  - Implement POST method:
    - Extract email and password.
    - Verify the user exists, compare the provided password with the stored hash.
    - If valid, set a session cookie (using the `cookie` package or manual header setting).
    ```typescript
    import { NextResponse } from "next/server";
    import pool from "@/lib/db";
    import { comparePassword } from "@/lib/hash";
    import { serialize } from "cookie";

    export async function POST(request: Request) {
      try {
        const { email, password } = await request.json();

        if (!email || !password) {
          return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const [users]: any = await pool.query("SELECT id, password FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
          return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const user = users[0];
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // Create a simple session token (for demonstration, use user id as token)
        const token = `${user.id}-${new Date().getTime()}`;
        const response = NextResponse.json({ message: "Login successful" });
        response.headers.append(
          "Set-Cookie",
          serialize("session_token", token, { path: "/", httpOnly: true, maxAge: 60 * 60 })
        );
        return response;
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
      }
    }
    ```

---

## 5. Frontend Pages

### a. Registration Page

- **File:** `src/app/auth/register/page.tsx`  
  - Build a modern, centered registration form using shadcn/ui components.
  - Form fields: name, email, password, graduation year, major.
  - On submission, call `/api/auth/register` and show success or error feedback.
    ```tsx
    import { useState } from "react";
    import { useRouter } from "next/navigation";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";

    export default function RegisterPage() {
      const router = useRouter();
      const [form, setForm] = useState({ name: "", email: "", password: "", graduationYear: "", major: "" });
      const [error, setError] = useState("");

      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
      };

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error);
          } else {
            router.push("/auth/login");
          }
        } catch (err) {
          setError("An unexpected error occurred");
        }
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="max-w-md w-full p-6 bg-white rounded shadow">
            <h2 className="text-2xl font-bold mb-4 text-center">Register</h2>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
              <Input name="email" placeholder="Email" type="email" value={form.email} onChange={handleChange} required />
              <Input name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} required />
              <Input name="graduationYear" placeholder="Graduation Year" value={form.graduationYear} onChange={handleChange} />
              <Input name="major" placeholder="Major" value={form.major} onChange={handleChange} />
              <Button type="submit" className="w-full">Register</Button>
            </form>
          </div>
        </div>
      );
    }
    ```

### b. Login Page

- **File:** `src/app/auth/login/page.tsx`  
  - Implement a simple login form with email and password.
  - Submit form data to `/api/auth/login` and handle redirection on success.
    ```tsx
    import { useState } from "react";
    import { useRouter } from "next/navigation";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";

    export default function LoginPage() {
      const router = useRouter();
      const [form, setForm] = useState({ email: "", password: "" });
      const [error, setError] = useState("");

      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
      };

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error);
          } else {
            router.push("/job-board");
          }
        } catch (err) {
          setError("An unexpected error occurred");
        }
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="max-w-md w-full p-6 bg-white rounded shadow">
            <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input name="email" placeholder="Email" type="email" value={form.email} onChange={handleChange} required />
              <Input name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} required />
              <Button type="submit" className="w-full">Login</Button>
            </form>
          </div>
        </div>
      );
    }
    ```

### c. Job Board Page

- **File:** `src/app/job-board/page.tsx`  
  - Create a modern UI that displays alumni job postings in a card layout.
  - Use a fetch call to `/api/job-board` on page load.
    ```tsx
    import { useEffect, useState } from "react";
    import { Button } from "@/components/ui/button";

    type Job = {
      id: number;
      title: string;
      company: string;
      location: string;
      postedDate: string;
    };

    export default function JobBoardPage() {
      const [jobs, setJobs] = useState<Job[]>([]);
      const [error, setError] = useState("");

      useEffect(() => {
        fetch("/api/job-board")
          .then((res) => res.json())
          .then((data) => setJobs(data))
          .catch((err) => setError("Failed to fetch jobs"));
      }, []);

      return (
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">Job Board</h1>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <div key={job.id} className="p-4 border rounded shadow">
                <h2 className="text-xl font-semibold">{job.title}</h2>
                <p>{job.company}</p>
                <p>{job.location}</p>
                <p className="text-sm text-gray-600">Posted on: {job.postedDate}</p>
                <Button className="mt-2">Apply</Button>
              </div>
            ))}
          </div>
        </div>
      );
    }
    ```

### d. Alumni Tracer Page

- **File:** `src/app/alumni-tracer/page.tsx`  
  - Build a search interface with filters (name, graduation year, etc.) and display results in either a table or card grid.
    ```tsx
    import { useState } from "react";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";

    type Alumni = {
      id: number;
      name: string;
      graduationYear: number;
      major: string;
    };

    export default function AlumniTracerPage() {
      const [query, setQuery] = useState("");
      const [results, setResults] = useState<Alumni[]>([]);
      const [error, setError] = useState("");

      const handleSearch = async () => {
        try {
          const res = await fetch(`/api/alumni-tracer?query=${encodeURIComponent(query)}`);
          const data = await res.json();
          setResults(data);
        } catch (err) {
          setError("Search failed");
        }
      };

      return (
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">Alumni Tracer</h1>
          <div className="mb-4 flex justify-center gap-2">
            <Input
              placeholder="Search by name or year"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-1/2"
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((alum) => (
              <div key={alum.id} className="p-4 border rounded shadow">
                <h2 className="text-xl font-semibold">{alum.name}</h2>
                <p>Class of {alum.graduationYear}</p>
                <p>Major: {alum.major}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    ```

---

## 6. API Endpoints for Data Retrieval

### a. Job Board API Endpoint

- **File:** `src/app/api/job-board/route.ts`  
  - Implement GET method to fetch job postings.  
  - Query the database “jobs” table (or return mock data if the table isn’t set up).
    ```typescript
    import { NextResponse } from "next/server";
    import pool from "@/lib/db";

    export async function GET() {
      try {
        const [jobs]: any = await pool.query("SELECT id, title, company, location, DATE_FORMAT(posted_date, '%Y-%m-%d') as postedDate FROM jobs");
        return NextResponse.json(jobs);
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch job postings" }, { status: 500 });
      }
    }
    ```

### b. Alumni Tracer API Endpoint

- **File:** `src/app/api/alumni-tracer/route.ts`  
  - Implement GET method to search alumni based on query filters.
    ```typescript
    import { NextResponse } from "next/server";
    import pool from "@/lib/db";

    export async function GET(request: Request) {
      try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("query") || "";
        
        const sqlQuery = "SELECT id, name, graduation_year as graduationYear, major FROM alumni WHERE name LIKE ? OR graduation_year LIKE ?";
        const searchTerm = `%${query}%`;
        const [results]: any = await pool.query(sqlQuery, [searchTerm, searchTerm]);
        
        return NextResponse.json(results);
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch alumni data" }, { status: 500 });
      }
    }
    ```

---

## 7. Navigation & Layout Integration

- **File:** `src/app/layout.tsx`  
  - Update or create a layout component that includes a responsive header with links to:
    - Home
    - Job Board (`/job-board`)
    - Alumni Tracer (`/alumni-tracer`)
    - Login/Register (`/auth/login` and `/auth/register`)
  - Ensure the header uses modern typography, adequate spacing, and a consistent color scheme.
  - Example snippet for header in layout:
    ```tsx
    import Link from "next/link";

    export default function RootLayout({ children }: { children: React.ReactNode }) {
      return (
        <html lang="en">
          <head>
            <title>Alumni Management System</title>
          </head>
          <body className="min-h-screen flex flex-col">
            <header className="bg-white shadow p-4 flex justify-between items-center">
              <h1 className="text-xl font-bold">Alumni System</h1>
              <nav className="space-x-4">
                <Link href="/">Home</Link>
                <Link href="/job-board">Job Board</Link>
                <Link href="/alumni-tracer">Alumni Tracer</Link>
                <Link href="/auth/login">Login</Link>
              </nav>
            </header>
            <main className="flex-grow">{children}</main>
            <footer className="p-4 text-center text-gray-600">© 2023 Alumni Management System</footer>
          </body>
        </html>
      );
    }
    ```

---

## 8. Error Handling, Validation & Testing

- Use try-catch blocks in all API routes.
- Validate inputs in registration and login endpoints before processing.
- Handle API fetch errors gracefully in the UI and display user-friendly messages.
- **Testing with curl:**  
  - Registration:
    ```bash
    curl -X POST http://localhost:3000/api/auth/register \
      -H "Content-Type: application/json" \
      -d '{"name": "Jane Doe", "email": "jane@example.com", "password": "secure123", "graduationYear": "2010", "major": "Computer Science"}'
    ```
  - Login:
    ```bash
    curl -X POST http://localhost:3000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email": "jane@example.com", "password": "secure123"}'
    ```
  - Job Board:
    ```bash
