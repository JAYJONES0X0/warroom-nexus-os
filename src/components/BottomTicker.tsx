export const BottomTicker = () => {
  const tickerData = [{
    symbol: "EUR/USD",
    price: "1.0847",
    change: "+0.34%",
    positive: true
  }, {
    symbol: "GBP/USD",
    price: "1.2634",
    change: "-0.12%",
    positive: false
  }, {
    symbol: "USD/JPY",
    price: "149.82",
    change: "+0.58%",
    positive: true
  }, {
    symbol: "BTC/USD",
    price: "$43,250",
    change: "+2.14%",
    positive: true
  }, {
    symbol: "ETH/USD",
    price: "$2,287",
    change: "+1.87%",
    positive: true
  }, {
    symbol: "GOLD",
    price: "$2,034",
    change: "+0.45%",
    positive: true
  }];

  // Double the data for seamless loop
  const doubledData = [...tickerData, ...tickerData];
  return <div className="fixed bottom-0 left-0 w-full h-16 bg-black/70 backdrop-blur-xl border-t border-primary/20 flex items-center overflow-hidden z-[100]">
      <div className="flex gap-16 animate-[scroll_30s_linear_infinite] whitespace-nowrap">
        {doubledData.map((item, index) => <div key={index} className="flex items-center gap-4 text-sm font-semibold">
            <span className="font-black text-[#a2934a]">{item.symbol}</span>
            <span className="text-white">{item.price}</span>
            <span className={`font-bold ${item.positive ? "text-green-500" : "text-red-500"}`}>
              {item.change}
            </span>
          </div>)}
      </div>
    </div>;
};