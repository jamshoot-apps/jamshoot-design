export const support = {
  title: 'Fixture support',
  byline: 'Integration reference',
  sections: [
    {
      id: 'purpose',
      title: 'Purpose',
      paragraphs: [
        'This page exists to exercise nested document contracts, shared page furniture and production metadata without copying a product site.',
        'The fixture remains deliberately small. It contains only configuration, theme values, page data and one representative block.',
      ],
      list: [
        'It imports component functions from the current checkout.',
        'It uses a build-time block renderer and a separate client block.',
        'It produces enough static text for the no-JavaScript content check.',
      ],
      table: {
        columns: ['Input', 'Owner'],
        rows: [
          ['Component markup and CSS', 'The library'],
          ['Theme, content and block', 'The fixture site'],
        ],
      },
      outro: [
        'A successful isolated run proves that tests do not need the name, path, installed package or content of a neighboring repository.',
      ],
    },
  ],
};
