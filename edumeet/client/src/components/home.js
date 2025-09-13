import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  Star,
  Sparkles,
  Zap
} from 'lucide-react';

// Floating Animation Component
const FloatingElement = ({ children, delay = 0, duration = 3 }) => {
  return (
    <div 
      className="animate-bounce"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        animationIterationCount: 'infinite'
      }}
    >
      {children}
    </div>
  );
};

// Gradient Text Component
const GradientText = ({ children, gradient = "from-blue-600 to-purple-600" }) => (
  <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
    {children}
  </span>
);

// Animated Card Component
const AnimatedCard = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`transform transition-all duration-1000 ${
        isVisible 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-10 opacity-0 scale-95'
      }`}
    >
      {children}
    </div>
  );
};

// Navbar Component
const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = () => {
    window.location.href = '/admin/login';
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-xl border-b border-gray-200/20' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="w-2 h-2 text-white" />
              </div>
            </div>
            <span className={`text-2xl font-bold transition-all duration-300 ${
              isScrolled ? 'text-gray-900' : 'text-white'
            } group-hover:scale-105`}>
              EduMeet
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a 
              href="#features" 
              className={`relative font-medium transition-all duration-300 group ${
                isScrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'
              }`}
            >
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a 
              href="#about" 
              className={`relative font-medium transition-all duration-300 group ${
                isScrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'
              }`}
            >
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <button 
              onClick={handleNavigation}
              className="group relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-8 py-3 rounded-full font-semibold overflow-hidden transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
            >
              <span className="relative z-10 flex items-center">
                Get Started
                <Zap className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform duration-300" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Home = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleNavigation = () => {
    window.location.href = '/admin/login';
  };

  const features = [
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "AI-powered appointment system that adapts to your schedule and preferences.",
      color: "from-blue-500 via-cyan-500 to-teal-500",
      delay: 0
    },
    {
      icon: MessageSquare,
      title: "Live Communication",
      description: "Real-time messaging with file sharing, voice notes, and video calls.",
      color: "from-purple-500 via-pink-500 to-rose-500",
      delay: 200
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Advanced insights with predictive analytics and performance tracking.",
      color: "from-green-500 via-emerald-500 to-teal-500",
      delay: 400
    },
    {
      icon: Users,
      title: "Smart Management",
      description: "Intuitive admin panel with role-based access and automated workflows.",
      color: "from-orange-500 via-red-500 to-pink-500",
      delay: 600
    }
  ];

  return (
    <div className="overflow-x-hidden relative">
      {/* Dynamic Background */}
      <div 
        className="fixed inset-0 opacity-30 transition-all duration-1000 ease-out pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.2) 50%, transparent 100%)`
        }}
      />
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(147, 51, 234, 0.95), rgba(236, 72, 153, 0.9)), url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
          {/* Animated Particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full opacity-20 animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Floating Elements */}
        <FloatingElement delay={0} duration={4}>
          <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full backdrop-blur-sm border border-white/20" />
        </FloatingElement>
        <FloatingElement delay={1} duration={5}>
          <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl opacity-80" />
        </FloatingElement>
        <FloatingElement delay={2} duration={3.5}>
          <div className="absolute bottom-40 left-20 w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full opacity-70" />
        </FloatingElement>

        <div className="relative z-20 text-center text-white max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedCard delay={300}>
            <h1 className="text-5xl md:text-8xl font-black mb-8 leading-tight tracking-tight">
              Welcome to{' '}
              <GradientText gradient="from-yellow-300 via-pink-300 to-purple-300">
                EduMeet
              </GradientText>
            </h1>
          </AnimatedCard>
          
          <AnimatedCard delay={600}>
            <p className="text-xl md:text-3xl mb-12 text-white/95 max-w-4xl mx-auto leading-relaxed font-light">
              The future of educational technology is here. Connect, learn, and grow 
              with our revolutionary platform.
            </p>
          </AnimatedCard>
          
          <AnimatedCard delay={900}>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button 
                onClick={handleNavigation}
                className="group relative bg-white text-gray-900 px-10 py-5 rounded-full font-bold text-xl overflow-hidden transition-all duration-500 transform hover:scale-110 hover:shadow-2xl"
              >
                <span className="relative z-10 flex items-center">
                  Launch Platform
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-0 group-hover:scale-100 rounded-full"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              </button>
              <button className="group relative border-3 border-white text-white px-10 py-5 rounded-full font-bold text-xl transition-all duration-500 hover:bg-white hover:text-gray-900 transform hover:scale-105">
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
              </button>
            </div>
          </AnimatedCard>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedCard delay={200}>
            <div className="text-center mb-24">
              <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-8">
                Powerful{' '}
                <GradientText gradient="from-blue-600 via-purple-600 to-pink-600">
                  Features
                </GradientText>
              </h2>
              <p className="text-2xl text-gray-600 max-w-4xl mx-auto font-light">
                Experience education technology like never before
              </p>
            </div>
          </AnimatedCard>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <AnimatedCard key={index} delay={feature.delay}>
                <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 border border-gray-100/50 backdrop-blur-sm overflow-hidden">
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  
                  {/* Icon Container */}
                  <div className="relative mb-8">
                    <div className={`w-20 h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                      <feature.icon className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse">
                      <Star className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed text-lg">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                    Explore Feature
                    <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <AnimatedCard delay={200}>
              <div>
                <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-8">
                  Revolutionizing{' '}
                  <GradientText gradient="from-purple-600 via-pink-600 to-red-600">
                    Education
                  </GradientText>
                </h2>
                <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                  EduMeet represents the next generation of educational platforms, 
                  combining cutting-edge technology with intuitive design to create 
                  seamless connections between educators and learners.
                </p>
                
                <div className="space-y-6 mb-12">
                  {[
                    "AI-powered smart scheduling",
                    "Advanced real-time communication",
                    "Comprehensive analytics dashboard",
                    "Mobile-first responsive design"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 group">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-gray-800 font-semibold text-lg group-hover:text-blue-600 transition-colors duration-300">{item}</span>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={handleNavigation}
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white px-10 py-5 rounded-full font-bold text-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
                >
                  Start Your Journey
                </button>
              </div>
            </AnimatedCard>
            
            <AnimatedCard delay={400}>
              <div className="relative group">
                <div className="absolute -inset-6 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                    alt="Students and teachers collaborating"
                    className="w-full h-96 object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-30 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${2 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <AnimatedCard delay={200}>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8">
              Ready to Transform{' '}
              <GradientText gradient="from-yellow-400 via-pink-400 to-purple-400">
                Education?
              </GradientText>
            </h2>
            <p className="text-2xl text-white/90 mb-16 max-w-4xl mx-auto font-light">
              Join the revolution and experience the future of educational technology today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button 
                onClick={handleNavigation}
                className="group relative bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white px-12 py-6 rounded-full font-bold text-xl overflow-hidden transition-all duration-500 transform hover:scale-110 hover:shadow-2xl"
              >
                <span className="relative z-10 flex items-center justify-center">
                  Launch EduMeet
                  <Sparkles className="w-6 h-6 ml-3 group-hover:rotate-180 transition-transform duration-500" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </button>
            </div>
          </AnimatedCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-8 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <span className="text-3xl font-bold group-hover:text-blue-400 transition-colors duration-300">EduMeet</span>
              </div>
              <p className="text-gray-400 leading-relaxed text-lg">
                Empowering education through innovative technology and meaningful connections.
              </p>
            </div>
            
            {[
              {
                title: "Platform",
                links: ["Features", "Appointments", "Messaging", "Analytics"]
              },
              {
                title: "Support", 
                links: ["Help Center", "Contact", "Documentation", "Community"]
              },
              {
                title: "Company",
                links: ["About", "Careers", "Privacy", "Terms"]
              }
            ].map((section, index) => (
              <div key={index}>
                <h4 className="font-bold mb-6 text-xl text-white">{section.title}</h4>
                <ul className="space-y-3 text-gray-400">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href="/admin/login" className="hover:text-white transition-colors duration-300 hover:translate-x-1 transform inline-block">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-800 pt-10 text-center">
            <p className="text-gray-400 text-lg">
              &copy; 2024 EduMeet. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;