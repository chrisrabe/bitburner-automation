/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	const fees = 100000; // 100k commission
	const tradeFees = 2 * fees; // buy + sell transactions
	let overallValue = 0;

	function getStonks() {
		const stockSymbols = ns.stock.getSymbols();
		const stocks = [];
		for (const sym of stockSymbols) {
			const pos = ns.stock.getPosition(sym);
			const stock = {
				sym,
				longShares: pos[0],
				longPrice: pos[1],
				shortShares: pos[2],
				shortPrice: pos[3],
				forecast: ns.stock.getForecast(sym),
				volatility: ns.stock.getVolatility(sym),
				askPrice: ns.stock.getAskPrice(sym),
				bidPrice: ns.stock.getBidPrice(sym),
				maxShares: ns.stock.getMaxShares(sym)
			};
			const longProfit = stock.longShares * (stock.bidPrice - stock.longPrice) - tradeFees;
			const shortProfit = stock.shortPrice * (stock.shortPrice - stock.askPrice) - tradeFees;
			stock.profit = longProfit + shortProfit;

			const longCost = stock.longShares * stock.longPrice;
			const shortCost = stock.shortShares * stock.shortPrice;
			stock.cost = longCost + shortCost;
			// 0.6 -> 0.1 (10% - LONG)
			// 0.4 -> 0.1 (10% - SHORT)
			const profitChance = Math.abs(stock.forecast - 0.5); // chance to make profit for either positions
			stock.profitPotential = stock.volatility * profitChance; // potential to get the price movement

			stock.summary = `${stock.sym}: ${stock.forecast.toFixed(3)} +/- ${stock.volatility.toFixed(3)}`;
			stocks.push(stock);
		}

		// Sort by profit potential
		return stocks.sort((a, b) => b.profitPotential - a.profitPotential);
	}

	function takeLongTendies(stock) {
		if (stock.forecast > 0.5) {
			// HOLD
			const curValue = stock.cost + stock.profit
			const roi = ns.nFormat(100 * (stock.profit / stock.cost), "0.00");
			ns.print(`INFO\t ${stock.summary} LONG ${ns.nFormat(curValue, '0a')} ${roi}%`);
			overallValue += curValue;
		} else {
			// Take tendies!
			const salePrice = ns.stock.sell(stock.sym, stock.longShares);
			const saleTotal = salePrice * stock.longShares;
			const saleCost = stock.longPrice * stock.longShares;
			const saleProfit = saleTotal - saleCost - tradeFees;
			stock.shares = 0;
			ns.print(`WARN\t${stock.summary} SOLD for ${ns.nFormat(saleProfit, "$0.0a")} profit`);
		}
	}

	function takeTendies(stocks) {
		for (const stock of stocks) {
			if (stock.longShares > 0) {
				takeLongTendies(stock);
			}
			// @TODO - Implement takeShortTendies when we have access (BN8)
		}
	}

	function yolo(stocks) {
		const riskThresh = 20 * fees;
		for (const stock of stocks) {
			const money = ns.getPlayer().money;
			if (stock.forecast > 0.55) {
				if (money > riskThresh) {
					const sharesWeCanBuy = Math.floor((money - fees) / stock.askPrice);
					const sharesToBuy = Math.min(stock.maxShares, sharesWeCanBuy);
					if (ns.stock.buy(stock.sym, sharesToBuy) > 0) {
						ns.print(`WARN\t${stock.summary}\t- LONG @ ${ns.nFormat(sharesToBuy, "$0.0a")}`);
					}
				}
			}
			// @TODO sell short when we have access (BN8)
		}
	}

	const tickDuration = 5 * 1000; // ~4s offline, ~6s online (5s compromise)

	while (true) {
		const stocks = getStonks();
		takeTendies(stocks);
		yolo(stocks);
		ns.print("Stock value: " + ns.nFormat(overallValue, '$0.00a'));
		ns.print("");
		overallValue = 0;
		// @TODO - Extend for market manipulation
		// - hack -> makes stock more likely to go down
		// - grow -> makes stock more likely to go up
		await ns.sleep(tickDuration);
	}

}