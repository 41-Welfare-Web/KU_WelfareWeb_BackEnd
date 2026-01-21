import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Target, Heart, Award } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
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
                <p className="text-sm text-muted-foreground">연 (YEON)</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link to="/" className="text-foreground hover:text-primary transition-colors">홈</Link>
              <Link to="/about" className="text-primary font-medium">학생복지위원회</Link>
              <Link to="/rental" className="text-foreground hover:text-primary transition-colors">중앙대여사업</Link>
              <Link to="/print" className="text-foreground hover:text-primary transition-colors">플로터인쇄사업</Link>
              <Link to="/board" className="text-foreground hover:text-primary transition-colors">홍보게시판</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 페이지 제목 */}
      <section className="bg-gradient-brand text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">학생복지위원회 소개</h2>
          <p className="text-xl text-white/90">학생들의 복지 증진을 위해 노력하는 건국대학교 41대 학생복지위원회 '연'입니다</p>
        </div>
      </section>

      {/* 서브 메뉴 */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-4">
            <Link to="/greeting" className="text-foreground hover:text-primary transition-colors py-2 border-b-2 border-transparent hover:border-primary">
              인사말
            </Link>
            <Link to="/projects" className="text-foreground hover:text-primary transition-colors py-2 border-b-2 border-transparent hover:border-primary">
              국별 사업
            </Link>
            <Link to="/organization" className="text-foreground hover:text-primary transition-colors py-2 border-b-2 border-transparent hover:border-primary">
              조직도
            </Link>
          </div>
        </div>
      </section>

      {/* 메인 콘텐츠 */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-3xl font-bold text-foreground mb-6">학생복지위원회 '연'</h3>
              <p className="text-lg text-muted-foreground mb-6">
                건국대학교 41대 학생복지위원회 '연'은 학생들의 복지 증진과 편의 제공을 위해 설립된 학생자치기구입니다. 
                '연'이라는 이름에는 학생들 간의 따뜻한 연결과 소통을 의미하며, 모든 학생들이 더 나은 대학 생활을 
                영위할 수 있도록 다양한 서비스와 사업을 운영하고 있습니다.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-primary rounded-lg">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-foreground font-medium">학생 중심의 복지 서비스</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-warm rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-foreground font-medium">소통과 참여를 통한 발전</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-soft rounded-lg">
                    <Target className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="text-foreground font-medium">지속가능한 서비스 운영</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-soft rounded-2xl p-8 shadow-soft">
                <img 
                  src="./images/프로필_로고.png" 
                  alt="학생복지위원회 연 프로필 로고" 
                  className="w-64 h-64 mx-auto object-contain"
                />
              </div>
            </div>
          </div>

          {/* 주요 가치 */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-foreground text-center mb-12">우리의 가치</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center hover:shadow-brand transition-all duration-300">
                <CardHeader>
                  <div className="p-4 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
                    <Heart className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">소통</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    학생들의 목소리에 귀 기울이고, 열린 소통을 통해 더 나은 서비스를 제공합니다.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-brand transition-all duration-300">
                <CardHeader>
                  <div className="p-4 bg-gradient-warm rounded-full w-fit mx-auto mb-4">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">협력</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    다양한 학생 조직과의 협력을 통해 시너지를 창출하고 공동의 목표를 달성합니다.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-brand transition-all duration-300">
                <CardHeader>
                  <div className="p-4 bg-gradient-soft rounded-full w-fit mx-auto mb-4">
                    <Award className="h-8 w-8 text-foreground" />
                  </div>
                  <CardTitle className="text-xl">혁신</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    새로운 아이디어와 기술을 도입하여 학생들에게 더 편리하고 효율적인 서비스를 제공합니다.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;