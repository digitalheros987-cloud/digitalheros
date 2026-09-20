import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6 p-4">
      <h1 className="text-4xl font-bold">Welcome to Digital Heroes</h1>
      <p className="text-lg text-gray-600">Golf performance tracking & charity fundraising</p>
      <div className="flex space-x-4">
        <Link href="/login" className="px-6 py-2 bg-black text-white rounded-md">
          Log in
        </Link>
        <Link href="/register" className="px-6 py-2 bg-white text-black border border-black rounded-md">
          Sign up
        </Link>
      </div>
    </div>
  );
}
