const Navbar = ({}) => {
  return (
    <nav className="fixed z-50 flex items-center justify-between w-full max-h-[10vh] px-4 py-10 backdrop-blur-md bg-background bg-opacity-30 md:px-8 lg:px-12 xl:px-16 2xl:px-24 border-1">
      <h1 className="text-4xl font-bold">MediaMorph</h1>
    </nav>
  );
}

export default Navbar