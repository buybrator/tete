'use client';

import { ArrowUpRight, MessageCircle, TrendingUp, Shield, Zap } from "lucide-react"
import Link from "next/link"
import "./marquee.css"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function Home() {
  return (
    <div className="text-foreground font-base prose-headings:font-heading prose-h1:2xl:text-6xl prose-h1:xl:text-5xl prose-h1:md:text-5xl prose-h1:sm:text-[33px] prose-h1:text-2xl prose-h2:2xl:text-4xl prose-h2:lg:text-4xl prose-h2:md:text-3xl prose-h2:text-2xl prose-h3:2xl:text-4xl prose-h3:xl:text-3xl prose-h3:lg:text-3xl prose-h3:md:text-2xl prose-h3:sm:text-xl">
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden items-center justify-center bg-background px-5 md:py-[200px] py-[100px] bg-[linear-gradient(to_right,#80808033_1px,transparent_1px),linear-gradient(to_bottom,#80808033_1px,transparent_1px)] bg-[size:70px_70px]">
        <div className="mx-auto w-container max-w-full">
          <div className="flex flex-col items-center text-center">
            <h1 className="leading-normal">
              실시간 트레이딩과 <br />{" "}
              <span className="relative px-2 sm:mr-2 mr-0 md:[&_svg]:size-[45px] sm:[&_svg]:size-7 bg-main/50 rounded-base border-2 border-border/40 dark:border-border/70">
                채팅이 만나다
                <StarIcon
                  className="absolute sm:block hidden md:-bottom-4 md:-right-5 -bottom-2.5 -right-2.5"
                />
                <StarIcon
                  className="absolute sm:block hidden md:-top-4 md:-left-5 -top-2.5 -left-2.5"
                />
              </span>{" "}
              TradeChat
            </h1>

            <p className="leading-snug w-full md:mt-[50px] md:mb-[60px] sm:mt-12 my-9 sm:mb-10 2xl:text-3xl xl:text-2xl lg:text-2xl xl:w-full lg:w-2/3 md:w-full md:text-2xl sm:text-xl text-xl">
              Solana 블록체인 기반의 탈중앙화 트레이딩 플랫폼으로 실시간 채팅과 트레이딩을 동시에 경험하세요.
            </p>

            <Link
              className="flex items-center gap-2.5 w-max text-main-foreground rounded-base border-2 border-border bg-main md:px-10 px-4 md:py-3 py-2 md:text-[22px] text-base shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
              href={"/trade"}
            >
              트레이딩 시작하기
              <ArrowUpRight className="md:size-[30px] size-5" />
            </Link>
          </div>
        </div>
      </main>

      <div>
        <div className="border-t-4 border-border bg-secondary-background md:py-4 py-3 overflow-hidden">
          <div className="animate-marquee-left flex" style={{"--gap": "35px", "--duration": "20s"} as any}>
            {Array.from({ length: 10 }).map((_, id) => {
              return (
                <div
                  className="flex items-center md:gap-[50px] gap-[35px] xl:[&_span]:text-3xl md:[&_span]:text-2xl sm:[&_span]:text-xl [&_span]:text-base lg:[&_svg]:size-[50px] md:[&_svg]:size-10 [&_svg]:size-[30px] flex-shrink-0"
                  key={id}
                >
                  <span className="whitespace-nowrap">실시간 트레이딩</span>
                  <TrendingUp className="text-foreground flex-shrink-0" />
                  <span className="whitespace-nowrap">채팅 플랫폼</span>
                  <MessageCircle className="text-main flex-shrink-0" />
                  <span className="whitespace-nowrap">Solana 블록체인</span>
                  <Shield className="text-foreground flex-shrink-0" />
                  <span className="whitespace-nowrap">탈중앙화</span>
                  <Zap className="text-main flex-shrink-0" />
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-b-4 border-t-4 border-border">
          <section className="border-b-4 md:border-r-4 border-border md:bg-background 2xl:p-14 2xl:py-16 xl:p-10 xl:py-10 lg:p-8 lg:py-10 p-5 py-7 border-r-0 bg-main md:text-foreground text-main-foreground">
            <div className="flex items-center sm:gap-6 gap-4 sm:mb-6 mb-4">
              <div className="xl:size-[70px] lg:size-[55px] sm:size-12 size-10 flex items-center justify-center">
                <MessageCircle className="w-full h-full" />
              </div>
              <h3>실시간 채팅</h3>
            </div>
            <p className="2xl:text-2xl xl:text-xl md:text-base sm:text-lg text-base">
              트레이더들과 실시간으로 소통하며 시장 동향과 투자 아이디어를 공유하세요.
            </p>
          </section>

          <section className="border-b-4 border-border md:text-main-foreground md:dark:text-main-foreground md:bg-main text-main-foreground dark:text-foreground 2xl:p-14 2xl:py-16 xl:p-10 xl:py-10 lg:p-8 lg:py-10 p-5 py-7 bg-background">
            <div className="flex items-center sm:gap-6 gap-4 sm:mb-6 mb-4">
              <div className="xl:size-[70px] lg:size-[55px] sm:size-12 size-10 flex items-center justify-center">
                <Shield className="w-full h-full" />
              </div>
              <h3>Solana 블록체인</h3>
            </div>
            <p className="2xl:text-2xl xl:text-xl md:text-base sm:text-lg text-base">
              빠르고 안전한 Solana 블록체인을 통해 낮은 수수료로 거래하세요.
            </p>
          </section>

          <section className="md:border-r-4 md:border-b-0 border-border bg-main dark:text-main-foreground 2xl:p-14 2xl:py-16 xl:p-10 xl:py-10 lg:p-8 lg:py-10 p-5 py-7 border-b-4">
            <div className="flex items-center sm:gap-6 gap-4 sm:mb-6 mb-4">
              <div className="xl:size-[70px] lg:size-[55px] sm:size-12 size-10 flex items-center justify-center">
                <TrendingUp className="w-full h-full" />
              </div>
              <h3>고급 트레이딩 도구</h3>
            </div>
            <p className="2xl:text-2xl xl:text-xl md:text-base sm:text-lg text-base">
              전문적인 차트와 분석 도구로 정확한 투자 결정을 내리세요.
            </p>
          </section>

          <section className="bg-background 2xl:p-14 2xl:py-16 xl:p-10 xl:py-10 lg:p-8 lg:py-10 p-5 py-7">
            <div className="flex items-center sm:gap-6 gap-4 sm:mb-6 mb-4">
              <div className="xl:size-[70px] lg:size-[55px] sm:size-12 size-10 flex items-center justify-center">
                <Zap className="w-full h-full" />
              </div>
              <h3>빠른 실행</h3>
            </div>
            <p className="2xl:text-2xl xl:text-xl md:text-base sm:text-lg text-base">
              밀리세컨드 단위의 빠른 주문 실행으로 최적의 거래 타이밍을 놓치지 마세요.
            </p>
          </section>
        </div>

        <section className="border-b-4 border-b-border bg-background py-16 lg:py-[100px]">
          <h2 className="mb-5 px-5 text-center">
            누구나 쉽게 시작할 수 있는 트레이딩
          </h2>
          <p className="text-center px-5 xl:text-xl md:text-lg sm:text-base text-sm">
            지갑을 연결하고 바로 트레이딩을 시작하세요. 복잡한 설정이나 KYC 없이 몇 초 만에 거래할 수 있습니다.
          </p>
        </section>

        <section className="inset-0 flex relative overflow-hidden w-full px-5 flex-col items-center justify-center bg-secondary-background bg-[linear-gradient(to_right,#80808033_1px,transparent_1px),linear-gradient(to_bottom,#80808033_1px,transparent_1px)] bg-[size:70px_70px] z-0">
          <div className="mx-auto w-container max-w-full py-16 lg:py-[100px]">
            <h2 className="sm:mb-20 mb-14 text-center">
              트레이더들이 선택하는 이유
            </h2>
            <div className="grid-cols-1 grid lg:grid-cols-3 gap-4 lg:gap-8">
              <div className="min-h-20 sm:w-[500px] w-full mx-auto mb-4 lg:min-h-48 lg:mb-8 lg:w-full rounded-base border-2 border-border bg-background p-5 shadow-shadow">
                <div className="flex items-center sm:gap-5 gap-3">
                  <div className="size-10 sm:size-12 rounded-base border-2 border-border flex items-center justify-center bg-main">
                    <MessageCircle className="text-main-foreground" />
                  </div>
                  <div>
                    <h4 className="sm:text-lg text-base font-heading">실시간 커뮤니케이션</h4>
                    <p className="text-xs sm:text-sm">트레이더</p>
                  </div>
                </div>
                <div className="sm:mt-5 mt-3 sm:text-base text-sm break-words">
                  "다른 트레이더들과 실시간으로 정보를 공유하면서 거래할 수 있어서 너무 좋아요!"
                </div>
              </div>

              <div className="min-h-20 sm:w-[500px] w-full mx-auto mb-4 lg:min-h-48 lg:mb-8 lg:w-full rounded-base border-2 border-border bg-background p-5 shadow-shadow">
                <div className="flex items-center sm:gap-5 gap-3">
                  <div className="size-10 sm:size-12 rounded-base border-2 border-border flex items-center justify-center bg-main">
                    <Shield className="text-main-foreground" />
                  </div>
                  <div>
                    <h4 className="sm:text-lg text-base font-heading">보안성</h4>
                    <p className="text-xs sm:text-sm">DeFi 투자자</p>
                  </div>
                </div>
                <div className="sm:mt-5 mt-3 sm:text-base text-sm break-words">
                  "개인키를 맡기지 않고도 안전하게 거래할 수 있어서 안심이 돼요."
                </div>
              </div>

              <div className="min-h-20 sm:w-[500px] w-full mx-auto mb-4 lg:min-h-48 lg:mb-8 lg:w-full rounded-base border-2 border-border bg-background p-5 shadow-shadow">
                <div className="flex items-center sm:gap-5 gap-3">
                  <div className="size-10 sm:size-12 rounded-base border-2 border-border flex items-center justify-center bg-main">
                    <TrendingUp className="text-main-foreground" />
                  </div>
                  <div>
                    <h4 className="sm:text-lg text-base font-heading">빠른 실행</h4>
                    <p className="text-xs sm:text-sm">데이트레이더</p>
                  </div>
                </div>
                <div className="sm:mt-5 mt-3 sm:text-base text-sm break-words">
                  "주문 실행 속도가 정말 빨라서 좋은 타이밍을 놓치지 않아요."
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t-4 z-0 border-t-border border-b-4 border-b-border bg-background py-16 lg:py-[100px]">
          <h2 className="sm:mb-20 mb-14 px-5 text-center">
            자주 묻는 질문
          </h2>

          <div className="mx-auto not-prose grid w-[700px] max-w-full px-5">
            <Accordion
              className="text-base sm:text-lg"
              type="single"
              collapsible
            >
              <AccordionItem className="mb-2" value="item-1">
                <AccordionTrigger className="text-left">
                  TradeChat은 안전한가요?
                </AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base">
                  네, TradeChat은 Solana 블록체인의 보안성을 기반으로 하며, 
                  사용자의 개인키를 저장하지 않는 비수탁형 지갑 연결 방식을 사용합니다.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem className="mb-2" value="item-2">
                <AccordionTrigger className="text-left">
                  어떤 토큰을 거래할 수 있나요?
                </AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base">
                  SOL을 비롯한 모든 SPL 토큰을 거래할 수 있습니다. 
                  주요 토큰들의 실시간 가격과 차트를 제공합니다.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem className="mb-2" value="item-3">
                <AccordionTrigger className="text-left">
                  수수료는 얼마인가요?
                </AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base">
                  Solana 네트워크의 기본 트랜잭션 수수료만 발생하며, 
                  추가적인 플랫폼 수수료는 없습니다.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  모바일에서도 사용할 수 있나요?
                </AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base">
                  네, 반응형 웹 디자인으로 모바일과 데스크톱 모두에서 
                  최적화된 사용자 경험을 제공합니다.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <div className="border-b-4 border-border bg-secondary-background md:py-4 py-3 overflow-hidden">
          <div className="animate-marquee-left direction-reverse flex" style={{"--gap": "35px", "--duration": "25s"} as any}>
            {Array.from({ length: 10 }).map((_, id) => {
              return (
                <div
                  className="flex items-center md:gap-[50px] gap-[35px] xl:[&_span]:text-3xl md:[&_span]:text-2xl sm:[&_span]:text-xl [&_span]:text-base lg:[&_svg]:size-[50px] md:[&_svg]:size-10 [&_svg]:size-[30px] flex-shrink-0"
                  key={id}
                >
                  <span className="whitespace-nowrap">DeFi Trading</span>
                  <Shield className="text-foreground flex-shrink-0" />
                  <span className="whitespace-nowrap">Real-time Chat</span>
                  <MessageCircle className="text-main flex-shrink-0" />
                  <span className="whitespace-nowrap">Solana Network</span>
                  <TrendingUp className="text-foreground flex-shrink-0" />
                  <span className="whitespace-nowrap">Fast Execution</span>
                  <Zap className="text-main flex-shrink-0" />
                </div>
              )
            })}
          </div>
        </div>

        <section className="inset-0 w-full flex flex-col items-center justify-center bg-main bg-[linear-gradient(to_right,#00000033_1px,transparent_1px),linear-gradient(to_bottom,#00000033_1px,transparent_1px)] bg-[size:70px_70px] px-5 lg:py-[200px] md:py-[150px] sm:py-[100px] py-[100px]">
          <h2 className="text-center font-heading not-prose 2xl:text-5xl xl:text-5xl md:text-4xl sm:text-3xl text-[22px] text-main-foreground mb-12">
            지금 바로 트레이딩을 시작하세요.
          </h2>

          <Link
            className="flex items-center gap-2.5 w-max text-foreground rounded-base border-2 border-border bg-background dark:bg-secondary-background md:px-10 px-4 md:py-3 py-2 md:text-[22px] text-base shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
            href={"/trade"}
          >
            트레이딩 시작하기
            <ArrowUpRight className="md:size-[30px] size-5" />
          </Link>
        </section>
      </div>

      <footer className="z-30 border-t-4 border-border bg-secondary-background px-5 py-5 text-center sm:text-base text-sm">
        TradeChat - 실시간 트레이딩과 채팅이 만나는 곳. Solana 블록체인 기반 탈중앙화 플랫폼.
      </footer>
    </div>
  )
}

const StarIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
  </svg>
)