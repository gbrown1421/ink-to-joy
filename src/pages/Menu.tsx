import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, BookOpen, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Menu = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-creative flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-creative bg-clip-text text-transparent">
                Coloring Book Creator
              </h1>
              <p className="text-sm text-muted-foreground">
                Transform your photos into beautiful coloring pages
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <section className="text-center space-y-6 py-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Create Custom Coloring Books</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Welcome to Your
            <span className="bg-gradient-creative bg-clip-text text-transparent">
              {" "}Creative Studio
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create personalized coloring books with custom difficulty levels and beautiful backgrounds
          </p>
        </section>

        <section className="max-w-2xl mx-auto mt-12">
          <Card className="p-8 shadow-card hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-creative flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Create New Coloring Book</h3>
                <p className="text-muted-foreground">Start your creative journey</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-foreground/80">
                Follow our simple process to create your custom coloring book:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-foreground/70">
                <li>Choose difficulty level</li>
                <li>Name your coloring book</li>
                <li>Upload your photos</li>
                <li>Edit and arrange pages</li>
                <li>Finalize and share or print</li>
              </ol>
              
              <Button 
                onClick={() => navigate('/create')}
                className="w-full mt-6"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started
              </Button>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Menu;
