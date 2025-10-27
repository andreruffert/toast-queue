const rootTemplate = document.createElement('template');
rootTemplate.innerHTML = `<toast-queue>
        <div data-part="menu">
          <button type="button">View less</button>
          <button type="button">Clear all</button>
        </div>
        <ol data-part="group"></ol>
      </toast-queue>`;

const options = {
  mode: 'stacked',
  rootTemplate,
};

export default options;
