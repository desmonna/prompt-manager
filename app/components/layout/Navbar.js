'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { Menu, Github, FolderPlus, Library } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'


export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center group">
              <span className="text-xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent hover:from-primary hover:to-primary/90 transition-all duration-300 tracking-tight">
                Prompt Manager
              </span>
            </Link>
            
            <NavigationMenu className="hidden sm:ml-6 sm:flex">
              <NavigationMenuList className="space-x-4">
                <NavigationMenuItem>
                  <Link href="/prompts" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={`${
                        pathname === '/prompts'
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground'
                      } flex items-center gap-1`}
                    >
                      <Library className="h-4 w-4" />
                      管理
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <Link href="/prompts/new" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={`${
                        pathname === '/prompts/new'
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground'
                      } flex items-center gap-1`}
                    >
                      <FolderPlus className="h-4 w-4" />
                      新建
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="https://github.com/desmonna/prompt-manager" target="_blank" legacyBehavior passHref>
                    <NavigationMenuLink className="text-muted-foreground flex items-center gap-1">
                      <Github className="h-4 w-4" />
                      GitHub
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <div className="sm:hidden flex items-center ml-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[240px] sm:hidden">
                  <div className="flex flex-col gap-4 mt-4">
                    <Link
                      href="/prompts"
                      className={`${
                        pathname === '/prompts'
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground'
                      } flex items-center gap-2`}
                    >
                      <Library className="h-4 w-4" />
                      管理
                    </Link>
                    <Link
                      href="/prompts/new"
                      className={`${
                        pathname === '/prompts/new'
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground'
                      } flex items-center gap-2`}
                    >
                      <FolderPlus className="h-4 w-4" />
                      新建
                    </Link>
                    <Link
                      href="https://github.com/desmonna/prompt-manager"
                      target="_blank"
                      className="text-muted-foreground flex items-center gap-2"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex items-center">
          <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
} 
