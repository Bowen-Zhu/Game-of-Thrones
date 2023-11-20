// Function to generate random data points
function generateRandomData(numPoints) {
    return Array.from({ length: numPoints }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100
    }));
}

// Function to create a scatterplot
function createScatterplot(elementId, data, color, title) {
    const svgWidth = 600, svgHeight = 400;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select('#' + elementId)
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Create scales
    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Set domains for scales
    x.domain(d3.extent(data, d => d.x));
    y.domain(d3.extent(data, d => d.y));

    // Add dots
    svg.selectAll('.dot')
        .data(data)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('r', 3.5)
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.y))
        .style('fill', color);

    // Add X axis
    svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x));

    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y));

    // Append title
    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 4))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#483D8B")
        .style("text-decoration", "underline")
        .text(title);
}

// Generate two sets of random data
const data1 = generateRandomData(50);
const data2 = generateRandomData(50);

// Create scatterplots
createScatterplot('scatterplot1', data1, '#008080', 'Sample Scatterplot 1');
createScatterplot('scatterplot2', data2, '#FF7F50', 'Sample Scatterplot 2');
