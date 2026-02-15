export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between">
      <h1 className="text-xl font-bold">Restaurant Demo</h1>
      <div className="space-x-4">
        <a href="#about" className="hover:underline">About</a>
        <a href="#menu" className="hover:underline">Menu</a>
      </div>
    </nav>
  );
}
