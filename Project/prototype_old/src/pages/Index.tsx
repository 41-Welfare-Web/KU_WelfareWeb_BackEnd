import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Printer, MessageSquare, ChevronRight, Phone, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="bg-white shadow-soft border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img 
                src="./images/기본로고.png" 
                alt="건국대학교 학생복지위원회 연 로고" 
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">건국대학교 41대 학생복지위원회</h1>
                <p className="text-sm text-muted-foreground">연 (連)</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link to="/about" className="text-foreground hover:text-primary transition-colors">학생복지위원회</Link>
              <Link to="/rental" className="text-foreground hover:text-primary transition-colors">중앙대여사업</Link>
              <Link to="/print" className="text-foreground hover:text-primary transition-colors">플로터인쇄사업</Link>
              <Link to="/board" className="text-foreground hover:text-primary transition-colors">홍보게시판</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 메인 히어로 섹션 */}
      <section className="relative bg-gradient-brand text-white py-20">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            하나의 마음, <br />
            <span className="text-yellow-200">이어지는 연</span>
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-white/90">
            건국대학교 41대 학생복지위원회 '연'
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <Link to="/about" className="flex items-center">
                위원회 소개 <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
              <Link to="/rental" className="flex items-center">
                대여 서비스 <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 주요 서비스 섹션 */}
      <section className="py-16 bg-soft-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">주요 서비스</h3>
            <p className="text-lg text-muted-foreground">학생들의 편의를 위한 다양한 서비스를 제공합니다</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 중앙대여사업 */}
            <Card className="hover:shadow-brand transition-all duration-300 border-2 hover:border-primary/20">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-warm rounded-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">중앙대여사업</CardTitle>
                    <Badge variant="secondary" className="mt-1">예약 시스템</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base mb-4">
                  학생회 활동에 필요한 각종 물품을 대여해드립니다.
                </CardDescription>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• 텐트, 테이블, 의자</li>
                  <li>• 음향장비, 마이크</li>
                  <li>• 기타 행사용품</li>
                </ul>
                <Button className="w-full bg-gradient-warm border-0" asChild>
                  <Link to="/rental">예약하기</Link>
                </Button>
              </CardContent>
            </Card>

            {/* 플로터인쇄사업 */}
            <Card className="hover:shadow-brand transition-all duration-300 border-2 hover:border-primary/20">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-primary rounded-lg">
                    <Printer className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">플로터인쇄사업</CardTitle>
                    <Badge variant="secondary" className="mt-1">대형 인쇄</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base mb-4">
                  대형 포스터, 현수막 등을 고품질로 인쇄해드립니다.
                </CardDescription>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• A0, A1, A2 사이즈</li>
                  <li>• 고품질 컴러 인쇄</li>
                  <li>• 빠른 작업 완료</li>
                </ul>
                <Button className="w-full bg-gradient-primary border-0" asChild>
                  <Link to="/print">인쇄 신청</Link>
                </Button>
              </CardContent>
            </Card>

            {/* 교내활동홍보게시판 */}
            <Card className="hover:shadow-brand transition-all duration-300 border-2 hover:border-primary/20">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-soft rounded-lg">
                    <MessageSquare className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">교내활동홍보</CardTitle>
                    <Badge variant="outline" className="mt-1">커뮤니티</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base mb-4">
                  다양한 교내 활동과 이벤트 정보를 확인하세요.
                </CardDescription>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• 학생회 활동 소식</li>
                  <li>• 축제 및 이벤트 안내</li>
                  <li>• 각종 공지사항</li>
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/board">게시판 보기</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/*
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-foreground mb-6">학생복지위원회 '연'</h3>
              <p className="text-lg text-muted-foreground mb-6">
                건국대학교 41대 학생복지위원회 '연'은 학생들의 복지 증진과 편의 제공을 위해 노력하고 있습니다. 
                다양한 서비스와 사업을 통해 학생들의 대학 생활을 더욱 풍요롭게 만들어 나가겠습니다.
              </p>
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-gradient-warm rounded-full">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">학생 중심의 서비스</h4>
                  <p className="text-sm text-muted-foreground">학생들의 니즈를 최우선으로 고려합니다</p>
                </div>
              </div>
              <Button size="lg" className="bg-gradient-brand border-0" asChild>
                <Link to="/about">더 자세히 알아보기</Link>
              </Button>
            </div>
            <div className="relative">
              <div className="bg-gradient-soft rounded-2xl p-8 shadow-soft">
                <img 
                  src="./images/프로필_로고.png" 
                  alt="학생복지위원회 연 프로필 로고" 
                  className="w-48 h-48 mx-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      */}
      {/* 연락처 섹션 */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">연락처</h3>
            <p className="text-lg text-muted-foreground">궁금한 점이 있으시면 언제든지 연락주세요</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="p-3 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Call</h4>
                <p className="text-muted-foreground">02-450-xxxx</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="p-3 bg-gradient-warm rounded-full w-fit mx-auto mb-4">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">E-mail</h4>
                <p className="text-muted-foreground">xxx@konkuk.ac.kr</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="p-3 bg-gradient-soft rounded-full w-fit mx-auto mb-4">
                  <MapPin className="h-6 w-6 text-foreground" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Location</h4>
                <p className="text-muted-foreground">학생회관 B110호</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-foreground text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h5 className="font-semibold mb-3">서비스</h5>
              <ul className="space-y-2 text-sm text-white/80">
                <li><Link to="/rental" className="hover:text-white transition-colors">중앙대여사업</Link></li>
                <li><Link to="/print" className="hover:text-white transition-colors">플로터인쇄사업</Link></li>
                <li><Link to="/board" className="hover:text-white transition-colors">홍보게시판</Link></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-3">소개</h5>
              <ul className="space-y-2 text-sm text-white/80">
                <li><Link to="/greeting" className="hover:text-white transition-colors">인사말</Link></li>
                <li><Link to="/projects" className="hover:text-white transition-colors">국별 사업</Link></li>
                <li><Link to="/organization" className="hover:text-white transition-colors">조직도</Link></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-3">연락처</h5>
              <ul className="space-y-2 text-sm text-white/80">
                <li>02-450-xxxx</li>
                <li>xxx@konkuk.ac.kr</li>
                <li>학생회관 B110호</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/60">
            <p>&copy; 2026 건국대학교 41대 학생복지위원회 '연'. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
