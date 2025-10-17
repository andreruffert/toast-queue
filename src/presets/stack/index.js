const rootTemplate = document.createElement('template');
rootTemplate.innerHTML = `<section data-tq-part="popover">
        <div data-tq-part="menu">
          <button type="button">View less</button>
          <button type="button">Clear all</button>
        </div>
        <ol data-tq-part="group"></ol>
      </section>`;

const options = {
  viewMode: 'stacked',
  rootTemplate,
};

export default options;
