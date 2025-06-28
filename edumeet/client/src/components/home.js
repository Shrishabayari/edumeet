import React from 'react';

const Home = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to EduMet
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your comprehensive educational platform
        </p>
        <div className="bg-white rounded-lg shadow-md p-6">
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