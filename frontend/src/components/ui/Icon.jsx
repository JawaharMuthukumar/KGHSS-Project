import {
  Languages, GraduationCap, TrendingUp, Sparkles, Trophy, ShieldCheck, Users,
  HeartHandshake, BookOpen, FlaskConical, Monitor, School, Trees, Droplets,
  Backpack, Camera, Swords, CircleDot, Crown, Circle, Zap, Leaf, BookMarked,
  Target, Home, Image as ImageIcon, Milestone, MessageCircleHeart, Menu, X,
  ChevronDown, Phone, Mail, MapPin, Youtube, Facebook, Instagram, ArrowRight,
  ArrowUpRight, Search, Calendar, Clock, ExternalLink, ChevronRight,
  ChevronLeft, ChevronUp, PlayCircle, Quote, Award, Building2, Globe,
  ClipboardList, Newspaper, ListFilter, Star, FileText, Sparkle, Bell,
  UserRound, CalendarDays, MoveRight, LogIn, UserCog, Lock, Eye, EyeOff,
  Info, ArrowLeft,
  LayoutDashboard, UserPlus, ClipboardCheck, CalendarRange, MessageSquare,
  FileCheck2, Settings, LogOut, BarChart3, Table2, Printer, Download, Check,
  Save, Plus, Trash2, Pencil, AlertTriangle, Inbox, KeyRound, RefreshCw,
  Loader2, ShieldAlert, ClipboardX, CircleCheck, CircleX, CircleAlert,
  ChevronsUpDown, SlidersHorizontal, FolderOpen, Images, UsersRound, Send,
} from "lucide-react";

const registry = {
  Languages, GraduationCap, TrendingUp, Sparkles, Trophy, ShieldCheck, Users,
  HeartHandshake, BookOpen, FlaskConical, Monitor, School, Trees, Droplets,
  Backpack, Camera, Swords, CircleDot, Crown, Circle, Zap, Leaf, BookMarked,
  Target, Home, ImageIcon, Milestone, MessageCircleHeart, Menu, X,
  ChevronDown, Phone, Mail, MapPin, Youtube, Facebook, Instagram, ArrowRight,
  ArrowUpRight, Search, Calendar, Clock, ExternalLink, ChevronRight,
  ChevronLeft, ChevronUp, PlayCircle, Quote, Award, Building2, Globe,
  ClipboardList, Newspaper, ListFilter, Star, FileText, Sparkle, Bell,
  UserRound, CalendarDays, MoveRight, LogIn, UserCog, Lock, Eye, EyeOff,
  Info, ArrowLeft,
  LayoutDashboard, UserPlus, ClipboardCheck, CalendarRange, MessageSquare,
  FileCheck2, Settings, LogOut, BarChart3, Table2, Printer, Download, Check,
  Save, Plus, Trash2, Pencil, AlertTriangle, Inbox, KeyRound, RefreshCw,
  Loader2, ShieldAlert, ClipboardX, CircleCheck, CircleX, CircleAlert,
  ChevronsUpDown, SlidersHorizontal, FolderOpen, Images, UsersRound, Send,
};

export default function Icon({ name, className = "", size = 20, strokeWidth = 1.8, ...rest }) {
  const Cmp = registry[name];
  if (!Cmp) return null;
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} aria-hidden="true" {...rest} />;
}
