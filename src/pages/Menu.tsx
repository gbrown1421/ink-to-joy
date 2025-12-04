import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Upload, Download, Shield, CheckCircle, Sparkles, BookOpen, Smile, RefreshCw, Layers, Zap, Image, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroTransformation from "@/assets/hero-transformation.png";
import pixfixLogo from "@/assets/pixfix-logo.png";

const Menu = () => {
  const navigate = useNavigate();
  const [selectedProjectType, setSelectedProjectType] = useState<'coloring' | 'cartoon'>('coloring');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('beginner');

  // Enable dark mode for this design
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={pixfixLogo} alt="Pix Fix Studio" style={{ height: '256px' }} />
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("products")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Products
              </button>
              <button onClick={() => scrollToSection("how-it-works")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Process
              </button>
              <button onClick={() => scrollToSection("pricing")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </button>
              <button onClick={() => scrollToSection("examples")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Examples
              </button>
              <button onClick={() => scrollToSection("faq")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </button>
            </nav>

            <Button onClick={() => navigate('/project-type')} size="sm" className="bg-foreground text-background hover:bg-foreground/90">
              Start Project
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-sm font-medium">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-muted-foreground">AI-Powered Photo Transformation</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                Transform photos into{" "}
                <span className="text-gradient-chrome">
                  stunning print-ready art
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                Convert your photos into professional coloring books, cartoon illustrations, and optimized images. Perfect for gifts, educators, and creative professionals.
              </p>
              
              <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
                <Button onClick={() => navigate('/project-type')} size="lg" className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90">
                  <Layers className="w-5 h-5 mr-2" />
                  Create Your Project
                </Button>
                <Button onClick={() => scrollToSection("examples")} variant="outline" size="lg" className="w-full sm:w-auto border-border text-foreground hover:bg-muted">
                  View Examples
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span>Print-ready PDFs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" />
                  <span>Secure processing</span>
                </div>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-glow">
                <img 
                  src={heroTransformation} 
                  alt="Photo to coloring page transformation - before and after comparison"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-card/90 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                    <p className="text-sm text-muted-foreground">Original photo → Coloring page</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">AI-powered line art conversion</p>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-silver-blue/10 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 scroll-mt-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <p className="text-sm font-medium text-accent uppercase tracking-wider">Our Services</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Professional Tools</h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Choose the transformation that fits your creative vision
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Embossed Floating Frame Card 1 */}
              <div className="relative group" style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                {/* Outer frame - top/left highlight */}
                <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 10%, #a0a0a0 50%, #707070 90%, #505050 100%)' }} />
                {/* Beveled edge - creates depth (8px top/sides, 24px bottom) */}
                <div className="absolute rounded-xl" style={{ top: '8px', left: '8px', right: '8px', bottom: '24px', background: 'linear-gradient(135deg, #606060 0%, #808080 10%, #c0c0c0 50%, #e8e8e8 90%, #ffffff 100%)' }} />
                {/* Inner face - the main surface (16px top/sides, 48px bottom) */}
                <div className="absolute rounded-lg" style={{ top: '16px', left: '16px', right: '16px', bottom: '48px', background: 'linear-gradient(180deg, #d8d8d8 0%, #b8b8b8 30%, #a8a8a8 70%, #909090 100%)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)' }} />
                {/* Content */}
                <Card className="relative z-10 bg-transparent border-0 shadow-none" style={{ margin: '16px 16px 48px 16px' }}>
                  <CardHeader className="pb-4">
                    <div className="relative w-14 h-14 mb-4">
                      {/* Outer steel blue metallic bevel */}
                      <div className="absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(135deg, #5a7a9a 0%, #3d5a75 20%, #2a4055 50%, #1a2a3a 80%, #0d1520 100%)' }} />
                      {/* Inner bevel highlight */}
                      <div className="absolute rounded-md" style={{ top: '3px', left: '3px', right: '3px', bottom: '3px', background: 'linear-gradient(135deg, #0d1520 0%, #1a2a3a 20%, #2a4a60 50%, #4a7090 80%, #6a90b0 100%)' }} />
                      {/* Dark blue center */}
                      <div className="absolute rounded flex items-center justify-center" style={{ top: '6px', left: '6px', right: '6px', bottom: '6px', background: 'linear-gradient(180deg, #4a6d8a 0%, #3d5a70 50%, #2c4a5e 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2)' }}>
                        <Image className="w-6 h-6 text-white/90" />
                      </div>
                    </div>
                    <CardTitle className="text-4xl text-black">Coloring Books</CardTitle>
                    <CardDescription className="text-lg text-black">Realistic line art from photos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-black">
                      Transform photos into beautiful line art pages. Multiple difficulty levels available for all ages.
                    </p>
                    <ul className="text-sm text-black space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{ color: '#2a4055' }} strokeWidth={2.5} />
                        4 difficulty levels
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{ color: '#2a4055' }} strokeWidth={2.5} />
                        Custom borders & text
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{ color: '#2a4055' }} strokeWidth={2.5} />
                        Print-ready PDF export
                      </li>
                    </ul>
                    <div className="relative w-full h-10">
                      <div className="absolute inset-0 rounded-md" style={{ background: 'linear-gradient(135deg, #5a7a9a 0%, #3d5a75 20%, #2a4055 50%, #1a2a3a 80%, #0d1520 100%)' }} />
                      <div className="absolute rounded" style={{ top: '2px', left: '2px', right: '2px', bottom: '2px', background: 'linear-gradient(135deg, #0d1520 0%, #1a2a3a 20%, #2a4a60 50%, #4a7090 80%, #6a90b0 100%)' }} />
                      <Button onClick={() => navigate('/project-type')} className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] text-white hover:opacity-90 border-0" style={{ background: 'linear-gradient(180deg, #4a6d8a 0%, #3d5a70 50%, #2c4a5e 100%)' }}>
                        Create Coloring Book
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Embossed Floating Frame Card 2 */}
              <div className="relative group" style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 10%, #a0a0a0 50%, #707070 90%, #505050 100%)' }} />
                <div className="absolute rounded-xl" style={{ top: '8px', left: '8px', right: '8px', bottom: '24px', background: 'linear-gradient(135deg, #606060 0%, #808080 10%, #c0c0c0 50%, #e8e8e8 90%, #ffffff 100%)' }} />
                <div className="absolute rounded-lg" style={{ top: '16px', left: '16px', right: '16px', bottom: '48px', background: 'linear-gradient(180deg, #d8d8d8 0%, #b8b8b8 30%, #a8a8a8 70%, #909090 100%)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)' }} />
                <Card className="relative z-10 bg-transparent border-0 shadow-none" style={{ margin: '16px 16px 48px 16px' }}>
                  <CardHeader className="pb-4">
                    <div className="relative w-14 h-14 mb-4">
                      {/* Outer steel blue metallic bevel */}
                      <div className="absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(135deg, #5a7a9a 0%, #3d5a75 20%, #2a4055 50%, #1a2a3a 80%, #0d1520 100%)' }} />
                      {/* Inner bevel highlight */}
                      <div className="absolute rounded-md" style={{ top: '3px', left: '3px', right: '3px', bottom: '3px', background: 'linear-gradient(135deg, #0d1520 0%, #1a2a3a 20%, #2a4a60 50%, #4a7090 80%, #6a90b0 100%)' }} />
                      {/* Dark blue center */}
                      <div className="absolute rounded flex items-center justify-center" style={{ top: '6px', left: '6px', right: '6px', bottom: '6px', background: 'linear-gradient(180deg, #4a6d8a 0%, #3d5a70 50%, #2c4a5e 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2)' }}>
                        <Smile className="w-6 h-6 text-white/90" />
                      </div>
                    </div>
                    <CardTitle className="text-xl text-gray-900">Cartoon Books</CardTitle>
                    <CardDescription className="text-gray-700">Stylized caricature illustrations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Get playful cartoon caricatures with exaggerated features. Perfect for unique gifts and keepsakes.
                    </p>
                    <ul className="text-sm text-gray-800 space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{ color: '#2a4055' }} strokeWidth={2.5} />
                        Bold cartoon style
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{ color: '#2a4055' }} strokeWidth={2.5} />
                        Character preservation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{ color: '#2a4055' }} strokeWidth={2.5} />
                        Fun caricature effect
                      </li>
                    </ul>
                    <div className="relative w-full h-10">
                      <div className="absolute inset-0 rounded-md" style={{ background: 'linear-gradient(135deg, #5a7a9a 0%, #3d5a75 20%, #2a4055 50%, #1a2a3a 80%, #0d1520 100%)' }} />
                      <div className="absolute rounded" style={{ top: '2px', left: '2px', right: '2px', bottom: '2px', background: 'linear-gradient(135deg, #0d1520 0%, #1a2a3a 20%, #2a4a60 50%, #4a7090 80%, #6a90b0 100%)' }} />
                      <Button onClick={() => navigate('/project-type')} className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] text-white hover:opacity-90 border-0" style={{ background: 'linear-gradient(180deg, #4a6d8a 0%, #3d5a70 50%, #2c4a5e 100%)' }}>
                        Create Cartoon Book
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Embossed Floating Frame Card 3 */}
              <div className="relative group" style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 10%, #a0a0a0 50%, #707070 90%, #505050 100%)' }} />
                <div className="absolute rounded-xl" style={{ top: '8px', left: '8px', right: '8px', bottom: '24px', background: 'linear-gradient(135deg, #606060 0%, #808080 10%, #c0c0c0 50%, #e8e8e8 90%, #ffffff 100%)' }} />
                <div className="absolute rounded-lg" style={{ top: '16px', left: '16px', right: '16px', bottom: '48px', background: 'linear-gradient(180deg, #d8d8d8 0%, #b8b8b8 30%, #a8a8a8 70%, #909090 100%)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)' }} />
                <Card className="relative z-10 bg-transparent border-0 shadow-none" style={{ margin: '16px 16px 48px 16px' }}>
                  <CardHeader className="pb-4">
                    <div className="relative w-14 h-14 mb-4">
                      {/* Outer steel blue metallic bevel */}
                      <div className="absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(135deg, #5a7a9a 0%, #3d5a75 20%, #2a4055 50%, #1a2a3a 80%, #0d1520 100%)' }} />
                      {/* Inner bevel highlight */}
                      <div className="absolute rounded-md" style={{ top: '3px', left: '3px', right: '3px', bottom: '3px', background: 'linear-gradient(135deg, #0d1520 0%, #1a2a3a 20%, #2a4a60 50%, #4a7090 80%, #6a90b0 100%)' }} />
                      {/* Dark blue center */}
                      <div className="absolute rounded flex items-center justify-center" style={{ top: '6px', left: '6px', right: '6px', bottom: '6px', background: 'linear-gradient(180deg, #4a6d8a 0%, #3d5a70 50%, #2c4a5e 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2)' }}>
                        <RefreshCw className="w-6 h-6 text-white/90" />
                      </div>
                    </div>
                    <CardTitle className="text-xl text-gray-900">Image Refresh</CardTitle>
                    <CardDescription className="text-gray-700">Optimize images for AI tools</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Normalize and optimize photos for AI processing. Fix compatibility issues in one click.
                    </p>
                    <ul className="text-sm text-gray-800 space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{ color: '#2a4055' }} strokeWidth={2.5} />
                        Auto-normalize format
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{ color: '#2a4055' }} strokeWidth={2.5} />
                        Optimal resizing
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{ color: '#2a4055' }} strokeWidth={2.5} />
                        Batch processing
                      </li>
                    </ul>
                    <div className="relative w-full h-10">
                      <div className="absolute inset-0 rounded-md" style={{ background: 'linear-gradient(135deg, #5a7a9a 0%, #3d5a75 20%, #2a4055 50%, #1a2a3a 80%, #0d1520 100%)' }} />
                      <div className="absolute rounded" style={{ top: '2px', left: '2px', right: '2px', bottom: '2px', background: 'linear-gradient(135deg, #0d1520 0%, #1a2a3a 20%, #2a4a60 50%, #4a7090 80%, #6a90b0 100%)' }} />
                      <Button onClick={() => navigate('/image-refresh')} className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] text-white hover:opacity-90 border-0" style={{ background: 'linear-gradient(180deg, #4a6d8a 0%, #3d5a70 50%, #2c4a5e 100%)' }}>
                        Refresh Images
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <p className="text-sm font-medium text-accent uppercase tracking-wider">Workflow</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Three Simple Steps</h2>
              <p className="text-lg text-muted-foreground">
                From photo to finished product in minutes
              </p>
            </div>

            {/* Step 1 */}
            <div className="mb-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-foreground">01</span>
                </div>
                <h3 className="text-2xl font-bold">Select Your Project Type</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div 
                  className={`cursor-pointer rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
                    selectedProjectType === 'coloring' ? 'border-accent bg-accent/5' : 'border-border bg-card'
                  }`}
                  onClick={() => setSelectedProjectType('coloring')}
                >
                  <h4 className="text-lg font-semibold mb-4">Realistic Coloring Book</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Original</p>
                      <img 
                        src="/images/example-photo-family.jpg" 
                        alt="Original family photo"
                        className="w-full aspect-square object-cover rounded-lg border border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Result</p>
                      <img 
                        src="/images/example-coloring-page.jpg" 
                        alt="Converted coloring page"
                        className="w-full aspect-square object-cover rounded-lg border border-border"
                      />
                    </div>
                  </div>
                </div>

                <div 
                  className={`cursor-pointer rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
                    selectedProjectType === 'cartoon' ? 'border-accent bg-accent/5' : 'border-border bg-card'
                  }`}
                  onClick={() => setSelectedProjectType('cartoon')}
                >
                  <h4 className="text-lg font-semibold mb-4">Cartoon Caricature Book</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Original</p>
                      <img 
                        src="/images/example-photo-kid-dog.jpg" 
                        alt="Original photo"
                        className="w-full aspect-square object-cover rounded-lg border border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Result</p>
                      <img 
                        src="/images/example-cartoon-page.jpg" 
                        alt="Cartoon style page"
                        className="w-full aspect-square object-cover rounded-lg border border-border"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Difficulty Selection */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h4 className="text-lg font-semibold mb-4">Detail Level</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'quick', label: 'Quick & Easy', img: '/images/difficulty-samples/difficulty-quick-sample.jpg' },
                    { id: 'beginner', label: 'Beginner', img: '/images/difficulty-samples/difficulty-beginner-sample.jpg' },
                    { id: 'intermediate', label: 'Intermediate', img: '/images/difficulty-samples/difficulty-intermediate-sample.jpg' },
                    { id: 'advanced', label: 'Advanced', img: '/images/difficulty-samples/difficulty-advanced-sample.jpg' }
                  ].map((difficulty) => (
                    <button
                      key={difficulty.id}
                      onClick={() => setSelectedDifficulty(difficulty.id)}
                      className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                        selectedDifficulty === difficulty.id 
                          ? 'border-accent bg-accent/5' 
                          : 'border-border bg-muted/30'
                      }`}
                    >
                      <img 
                        src={difficulty.img} 
                        alt={difficulty.label}
                        className="w-full aspect-square object-cover rounded-md mb-3"
                      />
                      <p className="text-sm font-medium text-center">{difficulty.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="mb-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-foreground">02</span>
                </div>
                <h3 className="text-2xl font-bold">Upload & Customize</h3>
              </div>

              <div className="bg-card rounded-xl border-2 border-dashed border-border p-12 mb-6 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h4 className="text-xl font-semibold mb-2">Upload 10–30 photos</h4>
                <p className="text-muted-foreground">Drag and drop or click to browse</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <img 
                  src="/images/example-cartoon-page.jpg" 
                  alt="Sample converted page"
                  className="w-full aspect-square object-cover rounded-lg border border-border"
                />
                <img 
                  src="/images/example-coloring-page.jpg" 
                  alt="Sample converted page"
                  className="w-full aspect-square object-cover rounded-lg border border-border"
                />
                <img 
                  src="/images/example-cartoon-page.jpg" 
                  alt="Sample converted page"
                  className="w-full aspect-square object-cover rounded-lg border border-border"
                />
              </div>

              <p className="text-center text-muted-foreground">
                Each photo converts to a page. Review, reorder, or remove before finalizing.
              </p>
            </div>

            {/* Step 3 */}
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-foreground">03</span>
                </div>
                <h3 className="text-2xl font-bold">Download & Print</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Digital PDF Delivery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Download a high-resolution, print-ready PDF optimized for standard US Letter (8.5×11") paper.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        300 DPI print quality
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        Instant download
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        Unlimited printing
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Print Options</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Print at home or use professional services for the best results.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        Home printer ready
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        Print shop compatible
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        Spiral binding ready
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section id="examples" className="py-20 scroll-mt-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <p className="text-sm font-medium text-accent uppercase tracking-wider">Gallery</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Sample Results</h2>
              <p className="text-lg text-muted-foreground">
                See the quality of our AI-powered transformations
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Coloring Page Example */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Coloring Book</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Before</p>
                    <img 
                      src="/images/example-photo-family.jpg" 
                      alt="Original family photo"
                      className="w-full aspect-[3/4] object-cover rounded-lg border border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">After</p>
                    <img 
                      src="/images/example-coloring-page.jpg" 
                      alt="Coloring page result"
                      className="w-full aspect-[3/4] object-cover rounded-lg border border-border"
                    />
                  </div>
                </div>
              </div>

              {/* Cartoon Example */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Cartoon Book</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Before</p>
                    <img 
                      src="/images/example-photo-kid-dog.jpg" 
                      alt="Original photo"
                      className="w-full aspect-[3/4] object-cover rounded-lg border border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">After</p>
                    <img 
                      src="/images/example-cartoon-page.jpg" 
                      alt="Cartoon result"
                      className="w-full aspect-[3/4] object-cover rounded-lg border border-border"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Final Product */}
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Print-Ready Output</h3>
              <img 
                src="/images/example-coffee-table-book.jpg" 
                alt="Finished coffee table book"
                className="w-full max-w-lg mx-auto rounded-xl border border-border shadow-card"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <p className="text-sm font-medium text-accent uppercase tracking-wider">Pricing</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Simple Pricing</h2>
              <p className="text-lg text-muted-foreground">
                Pay only for what you create
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-2xl">Coloring Books</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$0.25</span>
                    <span className="text-muted-foreground"> / page</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm text-muted-foreground space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      All difficulty levels included
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Custom borders & headings
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      High-resolution PDF
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Unlimited regenerations
                    </li>
                  </ul>
                  <Button onClick={() => navigate('/project-type')} className="w-full bg-foreground text-background hover:bg-foreground/90">
                    Start Coloring Book
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-2xl">Cartoon Books</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$0.35</span>
                    <span className="text-muted-foreground"> / page</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm text-muted-foreground space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Stylized caricature art
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Bold cartoon outlines
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      High-resolution PDF
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Unlimited regenerations
                    </li>
                  </ul>
                  <Button onClick={() => navigate('/project-type')} className="w-full bg-foreground text-background hover:bg-foreground/90">
                    Start Cartoon Book
                  </Button>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Payment processed securely. PDF delivered instantly after completion.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <p className="text-sm font-medium text-accent uppercase tracking-wider">Why Pix Fix Studio</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Built for Quality</h2>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { icon: Download, title: "Print-Ready PDFs", desc: "300 DPI resolution optimized for professional printing" },
                { icon: Shield, title: "Safe & Secure", desc: "Age-appropriate output with secure processing" },
                { icon: CheckCircle, title: "Full Control", desc: "Approve every page before finalizing your book" },
                { icon: Sparkles, title: "Instant Delivery", desc: "Download immediately after completion" }
              ].map((feature, index) => (
                <div key={index} className="text-center p-6 rounded-xl bg-card border border-border/50">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <p className="text-sm font-medium text-accent uppercase tracking-wider">Support</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">FAQ</h2>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {[
                {
                  q: "What photo formats are supported?",
                  a: "We accept JPEG, PNG, and HEIC files. Our system automatically optimizes images for the best results."
                },
                {
                  q: "How many photos can I include?",
                  a: "We recommend 10-30 photos per book for optimal results. Each photo becomes one page in your final book."
                },
                {
                  q: "Can I preview before paying?",
                  a: "Yes! You can see every converted page before finalizing. Only pay when you're satisfied with the results."
                },
                {
                  q: "What's the difference between difficulty levels?",
                  a: "Quick & Easy has fewer lines for young children. Beginner adds more detail. Intermediate includes shading areas. Advanced captures full photographic detail."
                },
                {
                  q: "How do I print my book?",
                  a: "Download the PDF and print at home on standard paper, or take to a print shop for professional binding. The file is optimized for 8.5×11\" paper."
                },
                {
                  q: "Is there a refund policy?",
                  a: "Since you approve every page before payment, refunds are handled case-by-case. Contact support if you have concerns."
                }
              ].map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="bg-card border border-border/50 rounded-xl px-6">
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Photos?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Create professional coloring books and cartoon illustrations in minutes.
            </p>
            <Button onClick={() => navigate('/project-type')} size="lg" className="bg-foreground text-background hover:bg-foreground/90">
              <Layers className="w-5 h-5 mr-2" />
              Start Your Project
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <img src={pixfixLogo} alt="Pix Fix Studio" className="h-10" />
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Pix Fix Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Menu;
