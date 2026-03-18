const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tiavhmbpplerffdjmodw.supabase.co', 'sb_publishable_H-eSK_By-dYJRD6DQvhzDA_W11z7-PQ');
async function test() {
  const { data, error } = await supabase.rpc('get_admin_dashboard_metrics', { days: 7 });
  console.log("DATA:", data);
  console.log("ERROR:", error);
}
test();
