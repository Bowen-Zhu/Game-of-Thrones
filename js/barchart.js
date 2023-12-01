class Barchart {
    constructor(parentElement, battlesData) {
        this.parentElement = parentElement;
        this.battlesData = battlesData;
        this.kingsData = this.processData();
        this.kingsArray = this.convertToArray(this.kingsData);
    }

    convertToArray(kingsData) {
        return Object.keys(kingsData).map(key => {
            return { king: key, ...kingsData[key] };
        });
    }

    processData() {
        let kingsData = {};

        this.battlesData.forEach(battle => {
            // Initialize data structure for each king
            [battle.attacker_king, battle.defender_king].forEach(king => {
                if (king && !kingsData[king]) {
                    kingsData[king] = {
                        attackingWins: 0,
                        attackingLosses: 0,
                        defendingWins: 0,
                        defendingLosses: 0
                    };
                }
            });

            // Increment attacking and defending counts
            if (battle.attacker_king) {
                if (battle.attacker_outcome === 'win') {
                    kingsData[battle.attacker_king].attackingWins += 1;
                } else if (battle.attacker_outcome === 'loss') {
                    kingsData[battle.attacker_king].attackingLosses += 1;
                }
            }
            if (battle.defender_king) {
                if (battle.attacker_outcome === 'loss') {
                    kingsData[battle.defender_king].defendingWins += 1;
                } else if (battle.attacker_outcome === 'win') {
                    kingsData[battle.defender_king].defendingLosses += 1;
                }
            }
        });

        return kingsData;
    }

    // Method to create the bar chart (to be implemented later)
    createChart() {
        const margin = {top: 20, right: 30, bottom: 40, left: 140};
        const width = 960 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        // Append SVG Object to the body
        const svg = d3.select("#" + this.parentElement).append("svg")
            .attr("class", "bar-chart-svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create X and Y scales
        const x = d3.scaleLinear().domain([0, 30]).range([0, width]);
        const y = d3.scaleBand().range([0, height]).padding(0.1);
        this.kingsArray = this.convertToArray(this.kingsData);
        y.domain(this.kingsArray.map(d => d.king))

        const tooltip = d3.select("#tooltip");

        const mouseover = function(event, d) {
            function generateTooltipContent(d) {
                const totalBattles = d.attackingWins + d.attackingLosses + d.defendingWins + d.defendingLosses;
                const attackingBattles = d.attackingWins + d.attackingLosses;
                const defendingBattles = d.defendingWins + d.defendingLosses;

                const barHeight = 150;
                const barWidth = 50;
                const spacing = 40;
                const svgWidth = barWidth * 3 + spacing * 4;
                const labelOffset = 20;

                let html = `<strong>${d.king}</strong><br><br><svg width="${svgWidth}" height="${barHeight + labelOffset * 2}">`;

                // Function to create a bar and its labels
                const createBar = (x, wins, losses) => {
                    const total = wins + losses;
                    const winsHeight = total > 0 ? (wins / total) * barHeight : 0;
                    const lossesHeight = total > 0 ? (losses / total) * barHeight : 0;
                    const winsY = barHeight - winsHeight;
                    const lossesY = winsY - lossesHeight; // Position losses above wins

                    let barHtml = `<rect width="${barWidth}" height="${winsHeight}" fill="green" x="${x}" y="${winsY}"></rect>` +
                        `<rect width="${barWidth}" height="${lossesHeight}" fill="red" x="${x}" y="${lossesY}"></rect>`;

                    // Add text labels for wins and losses
                    if (wins > 0) {
                        barHtml += `<text x="${x + barWidth / 2}" y="${winsY + winsHeight / 2 + 5}" text-anchor="middle" fill="white" font-size="12">${wins}</text>`;
                    }
                    if (losses > 0) {
                        barHtml += `<text x="${x + barWidth / 2}" y="${lossesY + lossesHeight / 2 + 5}" text-anchor="middle" fill="white" font-size="12">${losses}</text>`;
                    }

                    return barHtml;
                };

                // Create bars with labels
                html += createBar(spacing, d.attackingWins + d.defendingWins, d.attackingLosses + d.defendingLosses);
                html += createBar(barWidth + spacing * 2, d.attackingWins, d.attackingLosses);
                html += createBar(barWidth * 2 + spacing * 3, d.defendingWins, d.defendingLosses);

                // Add labels below bars
                html += `<text x="${spacing + barWidth / 2}" y="${barHeight + labelOffset}" text-anchor="middle" font-size="16">Total</text>`;
                html += `<text x="${barWidth + spacing * 2 + barWidth / 2}" y="${barHeight + labelOffset}" text-anchor="middle" font-size="16">Attacking</text>`;
                html += `<text x="${barWidth * 2 + spacing * 3 + barWidth / 2}" y="${barHeight + labelOffset}" text-anchor="middle" font-size="16">Defending</text>`;

                html += `</svg>`;

                return html;
            }


            tooltip.style("opacity", 1);
            // Set the content and position of the tooltip
            const htmlContent = generateTooltipContent(d);
            tooltip.html(htmlContent)
                .style("left", (event.pageX + 10 - 200) + "px")
                .style("top", (event.pageY - 28 - 6500) + "px");    // -200 and -6500 is temporary fix
        };

        const mouseout = function(d) {
            tooltip.style("opacity", 0);
        };

        // Constants for bar segments
        const barHeight = y.bandwidth() / 2;
        const attackingColor = "#2f4f4f";
        const defendingColor = "#FFD700";

        // Group each pair of attacking and defending bars
        const barGroup = svg.selectAll(".bar-group")
            .data(this.kingsArray)
            .enter().append("g")
            .attr("class", "bar-group");

        // Create attacking bars
        barGroup.append("rect")
            .attr("class", "bar bar-attacking")
            .attr("x", 0)
            .attr("y", d => y(d.king) + barHeight / 2)
            .attr("width", d => x(d.attackingWins + d.attackingLosses))
            .attr("height", barHeight)
            .attr("fill", attackingColor)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);

        // Create defending bars
        barGroup.append("rect")
            .attr("class", "bar bar-defending")
            .attr("x", d => x(d.attackingWins + d.attackingLosses))
            .attr("y", d => y(d.king) + barHeight / 2)
            .attr("width", d => x(d.defendingWins + d.defendingLosses))
            .attr("height", barHeight)
            .attr("fill", defendingColor)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);

        // Add labels for attacking and defending
        svg.selectAll(".label-attacking")
            .data(this.kingsArray)
            .enter().append("text")
            .attr("x", d => x(d.attackingWins + d.attackingLosses) - 5)
            .attr("y", d => y(d.king) + barHeight)
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .text(d => (d.attackingWins + d.attackingLosses > 0 && d.defendingWins + d.defendingLosses > 0) ? d.attackingWins + d.attackingLosses : "");

        svg.selectAll(".label-defending")
            .data(this.kingsArray)
            .enter().append("text")
            .attr("x", d => x(d.attackingWins + d.attackingLosses + d.defendingWins + d.defendingLosses) - 5) // Adjust position as needed
            .attr("y", d => y(d.king) + barHeight)
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .text(d => (d.attackingWins + d.attackingLosses > 0 && d.defendingWins + d.defendingLosses > 0) ? d.defendingWins + d.defendingLosses : "");

        // Add label for total
        svg.selectAll(".label-total")
            .data(this.kingsArray)
            .enter().append("text")
            .attr("x", d => x(d.attackingWins + d.attackingLosses + d.defendingWins + d.defendingLosses) + 5)
            .attr("y", d => y(d.king) + barHeight)
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .text(d => d.attackingWins + d.attackingLosses + d.defendingWins + d.defendingLosses);

        // Add the X Axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add the Y Axis
        svg.append("g")
            .call(d3.axisLeft(y));
    }
}
