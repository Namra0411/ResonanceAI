import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://esmyvgjrpvuazngwyjxp.supabase.co";
const SUPABASE_SERVICE_KEY =
  "***REMOVED***";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);

export default supabase;
