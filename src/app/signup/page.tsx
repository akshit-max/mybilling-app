// "use client";

// import { useState } from "react";
// import { auth } from "@/lib/firebase";
// import { createUserWithEmailAndPassword } from "firebase/auth";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import toast from "react-hot-toast";

// export default function Signup() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   const router = useRouter();

//   const handleSignup = async () => {
//     // ✅ VALIDATION
//     if (!email.trim() || !password.trim()) {
//       return toast.error("All fields are required");
//     }

//     if (!email.includes("@")) {
//       return toast.error("Enter a valid email");
//     }

//     if (password.length < 6) {
//       return toast.error("Password must be at least 6 characters");
//     }

//     try {
//       setLoading(true);

//       await createUserWithEmailAndPassword(auth, email, password);

//       toast.success("Account created 🎉");

//       router.push("/dashboard");
//     } catch (error) {
//       const err = error as { code?: string; message?: string };

//       if (err.code === "auth/email-already-in-use") {
//         toast.error("Email already in use");
//       } else if (err.code === "auth/invalid-email") {
//         toast.error("Invalid email format");
//       } else if (err.code === "auth/weak-password") {
//         toast.error("Password is too weak");
//       } else {
//         toast.error(err.message || "Signup failed");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <section
//       className="min-h-screen flex items-center justify-center 
//     bg-gradient-to-br from-[#0B1120] via-[#1E1B4B] to-[#4C1D95] px-6"
//     >
//       <div
//         className="w-full max-w-md bg-white/5 backdrop-blur-xl 
//       border border-white/10 rounded-2xl p-8 shadow-xl"
//       >
//         {/* LOGO */}
//         <h2 className="text-2xl font-semibold text-white mb-2">
//           <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
//             my
//           </span>
//           BillBook
//         </h2>

//         <p className="text-white/60 text-sm mb-6">Create your account</p>

//         <div className="space-y-4">
//           <input
//             type="email"
//             placeholder="Email address"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/10 
//             text-white placeholder:text-white/40 outline-none focus:border-purple-400"
//           />

//           <input
//             type="password"
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/10 
//             text-white placeholder:text-white/40 outline-none focus:border-purple-400"
//           />

//           <button
//             onClick={handleSignup}
//             disabled={loading}
//             className="w-full py-3 rounded-lg text-sm font-medium 
//   bg-gradient-to-r from-purple-600 to-indigo-600 
//   hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center"
//           >
//             {loading ? (
//               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//             ) : (
//               "Create Account"
//             )}
//           </button>
//         </div>

//         <p className="text-sm text-white/60 mt-6 text-center">
//           Already have an account?{" "}
//           <Link href="/login" className="text-purple-400 hover:underline">
//             Login
//           </Link>
//         </p>
//       </div>
//     </section>
//   );
// }





"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { FirebaseError } from "firebase/app";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      return toast.error("All fields are required");
    }

    if (!email.includes("@")) {
      return toast.error("Enter a valid email");
    }

    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    try {
      setLoading(true);

      await createUserWithEmailAndPassword(auth, email, password);

      toast.success("Account created 🎉");
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === "auth/email-already-in-use") {
          toast.error("Email already in use");
        } else if (error.code === "auth/invalid-email") {
          toast.error("Invalid email format");
        } else if (error.code === "auth/weak-password") {
          toast.error("Password is too weak");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Signup failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-sm">

        {/* LOGO */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            my
          </span>
          BillBook
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          Create your account
        </p>

        {/* FORM */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSignup();
          }}
          className="space-y-4"
        >
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 
            text-gray-900 placeholder:text-gray-400 
            outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 
            text-gray-900 placeholder:text-gray-400 
            outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium 
              bg-gradient-to-r from-purple-600 to-indigo-600 
              hover:from-purple-700 hover:to-indigo-700
              text-white transition disabled:opacity-50 
              flex items-center justify-center shadow-sm hover:shadow-md"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* FOOTER */}
        <p className="text-sm text-gray-600 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-600 hover:underline">
            Login
          </Link>
        </p>

      </div>
    </section>
  );
}