let showList = [10, 25, 50, 100];
const numRows = Math.floor(($(window).height() - $('#ingredientTableBody').offset().top - 120) / 45);
if (!showList.includes(numRows)) {
  showList.push(numRows);
}
showList.sort((a, b) => a - b);
$('#ingredientTable').DataTable({
    serverSide: true,
    processing: true,
    ajax: {
      url: '/api/inventory/ingredient',
      type: 'GET'
    },
    pageLength: numRows,
    lengthMenu: [showList, showList],
    columns: [
      { data: 'name' },
      { data: 'unit' },
      { data: 'category.name', defaultContent: '' },
      { data: 'minStock' },
      { data: 'note' }
    ],
  });

  