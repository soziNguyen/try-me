$('#ingredientTable').DataTable({
    serverSide: true,
    processing: true,
    ajax: {
      url: '/api/inventory/ingredient',
      type: 'GET'
    },
    pageLength: 10,
    columns: [
      { data: 'name' },
      { data: 'unit' },
      { data: 'category.name', defaultContent: '' },
      { data: 'minStock' },
      { data: 'note' }
    ],
    order: [[0, 'asc']]
  });
  