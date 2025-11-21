import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Palette, Upload, Download, Shield, CheckCircle, Sparkles, BookOpen, Smile } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Menu = () => {
  const navigate = useNavigate();
  const [selectedProjectType, setSelectedProjectType] = useState<'coloring' | 'cartoon'>('coloring');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('beginner');

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-creative flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">Ink to Joy</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection("products")} className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                Products
              </button>
              <button onClick={() => scrollToSection("how-it-works")} className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                How it works
              </button>
              <button onClick={() => scrollToSection("pricing")} className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                Pricing
              </button>
              <button onClick={() => scrollToSection("examples")} className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                Examples
              </button>
              <button onClick={() => scrollToSection("faq")} className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                FAQ
              </button>
            </nav>

            <Button onClick={() => navigate('/project-type')} size="sm">
              Create a book
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                <span>Turn Photos into Print-Ready Books</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Turn your photos into{" "}
                <span className="bg-gradient-creative bg-clip-text text-transparent">
                  books, cartoons, and coloring pages
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground">
                Upload your favorite photos, choose your style, and get a beautiful print-ready PDF in minutes. Perfect for gifts, classrooms, or family fun.
              </p>
              
              <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
                <Button onClick={() => navigate('/project-type')} size="lg" className="w-full sm:w-auto">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Create your book
                </Button>
                <Button onClick={() => scrollToSection("examples")} variant="outline" size="lg" className="w-full sm:w-auto">
                  See sample books
                </Button>
              </div>
            </div>

            {/* Right: Image Collage */}
            <div className="relative">
              <div className="relative">
                <img 
                  src="/images/hero-teacher-coloring.jpg" 
                  alt="Teacher with young children happily coloring in custom coloring books at a classroom table"
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -right-6 w-48 h-48 rounded-xl shadow-xl overflow-hidden border-4 border-background">
                  <img 
                    src="/images/hero-coloring-page.jpg" 
                    alt="Close-up of a personalized coloring page with a child's name in the header"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="container mx-auto px-4 py-20 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl font-bold">Our Products</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect project type for your creative vision
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-xl transition-shadow overflow-hidden">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img 
                  src="/images/product-coloring-classroom.jpg" 
                  alt="Teacher with students coloring together at a classroom table"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-gradient-creative flex items-center justify-center mb-4">
                  <Palette className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle>Custom Coloring Books</CardTitle>
                <CardDescription>Perfect for kids, classrooms, and creative fun</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Transform your photos into beautiful line art coloring pages. Choose difficulty levels from simple to advanced, add custom borders and headings.
                </p>
                <Button onClick={() => navigate('/project-type')} className="w-full">
                  Start a coloring book
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-shadow overflow-hidden">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img 
                  src="/images/product-grandparent-cartoon-book.jpg" 
                  alt="Grandparent sitting on couch smiling while flipping through a cartoon-style book of grandchildren"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <Smile className="w-6 h-6 text-secondary-foreground" />
                </div>
                <CardTitle>Cartoon / Caricature Books</CardTitle>
                <CardDescription>Fun cartoon versions of your family photos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Get playful cartoon caricatures with exaggerated features and bold outlines. Great for unique gifts and fun family books.
                </p>
                <Button onClick={() => navigate('/project-type')} className="w-full">
                  Start a cartoon book
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-shadow opacity-75 overflow-hidden">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img 
                  src="/images/product-calendars-memo-books.jpg" 
                  alt="Stack of calendar and notebook with pen on desk"
                  className="w-full h-full object-cover opacity-60"
                />
              </div>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-muted-foreground" />
                </div>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>Calendars & Memo Books</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create custom photo calendars and memo books with your favorite memories. Stay tuned for these exciting new products!
                </p>
                <Button disabled className="w-full">
                  Notify me
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted/30 py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl md:text-5xl font-bold">How It Works</h2>
              <p className="text-xl text-muted-foreground">
                Create your custom book in three simple steps
              </p>
            </div>

            {/* Step 1: Pick Your Project */}
            <div className="mb-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-gradient-creative flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary-foreground">1</span>
                </div>
                <h3 className="text-3xl font-bold">Pick Your Project</h3>
              </div>

              {/* Project Type Toggle Cards */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedProjectType === 'coloring' ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedProjectType('coloring')}
                >
                  <CardHeader>
                    <CardTitle className="text-xl">Realistic Coloring Book</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Before</p>
                        <img 
                          src="/images/example-photo-family.jpg" 
                          alt="Original family photo"
                          className="w-full aspect-square object-cover rounded-lg border border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">After</p>
                        <img 
                          src="/images/example-coloring-page.jpg" 
                          alt="Converted coloring page"
                          className="w-full aspect-square object-cover rounded-lg border border-border"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedProjectType === 'cartoon' ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedProjectType('cartoon')}
                >
                  <CardHeader>
                    <CardTitle className="text-xl">Cartoon / Caricature Coloring Book</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Before</p>
                        <img 
                          src="/images/example-photo-kid-dog.jpg" 
                          alt="Original photo"
                          className="w-full aspect-square object-cover rounded-lg border border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">After</p>
                        <img 
                          src="/images/example-cartoon-page.jpg" 
                          alt="Cartoon style page"
                          className="w-full aspect-square object-cover rounded-lg border border-border"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Difficulty Selection */}
              <div className="bg-background/50 rounded-lg p-6 border border-border">
                <h4 className="text-lg font-semibold mb-4">Choose your detail level</h4>
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
                          ? 'border-primary bg-primary/5' 
                          : 'border-border bg-background'
                      }`}
                    >
                      <img 
                        src={difficulty.img} 
                        alt={difficulty.label}
                        className="w-full aspect-square object-cover rounded-md mb-2"
                      />
                      <p className="text-sm font-medium text-center">{difficulty.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Upload & Customize */}
            <div className="mb-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Upload className="w-6 h-6 text-secondary-foreground" />
                </div>
                <h3 className="text-3xl font-bold">Upload & Customize</h3>
              </div>

              <div className="bg-background rounded-lg border-2 border-dashed border-border p-12 mb-6 text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
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
                We convert each photo into a page. You approve, re-order, or delete before finalizing.
              </p>
            </div>

            {/* Step 3: Download & Print */}
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Download className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="text-3xl font-bold">Download & Print</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-xl">Print-ready PDF</CardTitle>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">Example</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <img 
                      src="/images/hero-multi-pages-quick.png" 
                      alt="Stack of coloring pages"
                      className="w-full aspect-video object-cover rounded-lg border border-border mb-4"
                    />
                    <p className="text-sm text-muted-foreground">
                      High-quality PDF ready to print at home or any print shop. Standard 8.5×11 format.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-xl">Book-ready file</CardTitle>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">Example</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <img 
                      src="/images/example-coffee-table-book.jpg" 
                      alt="Finished book"
                      className="w-full aspect-video object-cover rounded-lg border border-border mb-4"
                    />
                    <p className="text-sm text-muted-foreground">
                      Professional format perfect for binding services or online book printing.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={() => navigate('/project-type')} size="lg">
                Start Creating Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="container mx-auto px-4 py-20 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl font-bold">Examples</h2>
            <p className="text-xl text-muted-foreground">
              See the magic of transformation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Photo → Coloring Page</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Before</p>
                    <img 
                      src="/images/example-photo-family.jpg" 
                      alt="Original family photo before conversion"
                      className="example-card-image shadow-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">After</p>
                    <img 
                      src="/images/example-coloring-page.jpg" 
                      alt="Converted coloring page with line art"
                      className="example-card-image shadow-md"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Transform any photo into beautiful line art
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Photo → Cartoon Page</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Before</p>
                    <img 
                      src="/images/example-photo-kid-dog.jpg" 
                      alt="Original photo of child with pet dog"
                      className="example-card-image shadow-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">After</p>
                    <img 
                      src="/images/example-cartoon-page.jpg" 
                      alt="Cartoon style illustration of child with pet"
                      className="example-card-image shadow-md"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Get fun caricature versions of your photos
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Finished Book</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <img 
                  src="/images/example-coffee-table-book.jpg" 
                  alt="Finished printed book displayed on a coffee table"
                  className="example-card-image shadow-md"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Print-ready PDF with custom borders
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/30 py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-bold">Pricing</h2>
              <p className="text-xl text-muted-foreground">
                Simple, transparent pricing for print-ready PDFs
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Coloring Book (PDF)</CardTitle>
                  <div className="text-3xl font-bold text-primary mt-2">From $19</div>
                  <CardDescription>for up to 24 pages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Transform photos into line-art coloring pages</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Choose difficulty levels (easy to advanced)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Custom borders and headings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">High-resolution print-ready PDF</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Cartoon Book (PDF)</CardTitle>
                  <div className="text-3xl font-bold text-secondary mt-2">From $29</div>
                  <CardDescription>for up to 24 pages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-sm">AI-powered cartoon caricatures</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-sm">Fun exaggerated features and bold outlines</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-sm">Custom borders and headings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-sm">High-resolution print-ready PDF</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center p-6 bg-card rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> We do not ship printed books. You download a print-ready PDF and can print anywhere you like – at home, local print shops, or online printing services.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Ink to Joy */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl font-bold">Why Ink to Joy?</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Designed for Real Printing</h3>
                  <p className="text-sm text-muted-foreground">
                    High-resolution PDFs optimized for professional printing at any print shop or home printer.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Kid-Safe Styles</h3>
                  <p className="text-sm text-muted-foreground">
                    All content is family-friendly with safe, appropriate transformations perfect for children.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">You Approve Pages Before You Pay</h3>
                  <p className="text-sm text-muted-foreground">
                    Review and customize every page before finalizing your order. No surprises.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Instant Digital Delivery</h3>
                  <p className="text-sm text-muted-foreground">
                    Get your PDF immediately after payment. Print multiple copies whenever you want.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-muted/30 py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-bold">Frequently Asked Questions</h2>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="shipping" className="bg-card border border-border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  Do you ship printed books?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  No, we provide a high-resolution, print-ready PDF that you can download instantly. You can then print it at home, take it to a local print shop, or use any online printing service. This gives you flexibility and control over the final product quality and cost.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="mixing" className="bg-card border border-border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  Can I mix coloring and cartoon pages in one book?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Currently, each book must be either all coloring pages or all cartoon pages. However, you can create multiple books and combine the PDFs yourself if you'd like a mixed book. We're considering adding mixed-mode support in the future!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="safety" className="bg-card border border-border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  Are my photos safe and private?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! Your photos are securely stored and only used to generate your book. We never share or use your photos for any other purpose. You can delete your project and all associated photos at any time.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="photos" className="bg-card border border-border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  How many photos do I need?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  You can create a book with as few as 1 page or up to 24 pages. Each page uses one photo. We recommend uploading clear, well-lit photos with good contrast for the best results. You can preview and approve each transformation before finalizing.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="quality" className="bg-card border border-border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  What if I don't like how a page turned out?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  You review every page before finalizing your book. You can remove any pages you don't like, try different photos, or adjust settings. Only pay when you're completely satisfied with all pages.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6 p-12 bg-gradient-creative rounded-3xl">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground">
            Ready to create your book?
          </h2>
          <p className="text-xl text-primary-foreground/90">
            Start transforming your photos into beautiful books today
          </p>
          <Button 
            onClick={() => navigate('/project-type')} 
            size="lg" 
            variant="secondary"
            className="text-lg"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-creative flex items-center justify-center">
                <Palette className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Ink to Joy</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Ink to Joy. Transform your photos into creative books.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Menu;
