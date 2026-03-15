function App() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo/Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-3xl font-bold">🚴</span>
        </div>
        <h1 className="text-3xl font-bold text-secondary">Sirnawa Solutions</h1>
        <p className="text-secondary/80 mt-2">Bike Delivery System</p>
      </div>

      {/* Welcome Card */}
      <div className="bg-card rounded-xl shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4 text-center">Welcome</h2>
        <p className="text-secondary/80 text-center mb-6">
          Your reliable bike delivery partner in Nairobi & environs.
        </p>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <a 
            href="/login" 
            className="block w-full bg-primary text-white text-center py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            Login
          </a>
          <a 
            href="/signup" 
            className="block w-full border-2 border-primary text-primary text-center py-3 rounded-lg font-semibold hover:bg-primary/10 transition"
          >
            Create Account
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-secondary/60">
        © {new Date().getFullYear()} Sirnawa Solutions. All rights reserved.
      </p>
    </div>
  );
}

export default App;