import React from 'react';

const Home = () => {
  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat px-4 py-8"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
      }}
    >
      <div className="relative z-10 text-center text-white max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to EduMet
        </h1>
        <p className="text-xl mb-8">
          Your comprehensive educational platform
        </p>
        <div className="bg-white text-gray-900 rounded-lg shadow-md p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="font-semibold">Interactive Learning</h3>
              <p className="text-gray-600">Engage with dynamic content</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold">Progress Tracking</h3>
              <p className="text-gray-600">Monitor your learning journey</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold">Community</h3>
              <p className="text-gray-600">Connect with fellow learners</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
