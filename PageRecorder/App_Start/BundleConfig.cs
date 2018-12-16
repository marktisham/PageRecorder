using System.Web;
using System.Web.Optimization;

namespace PageRecorder
{
    public class BundleConfig
    {
        // For more information on bundling, visit https://go.microsoft.com/fwlink/?LinkId=301862
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/bundles/jquery").Include(
                        "~/Scripts/jquery-{version}.js"));

            bundles.Add(new ScriptBundle("~/bundles/jqueryval").Include(
                        "~/Scripts/jquery.validate*"));

            // Use the development version of Modernizr to develop with and learn from. Then, when you're
            // ready for production, use the build tool at https://modernizr.com to pick only the tests you need.
            bundles.Add(new ScriptBundle("~/bundles/modernizr").Include(
                        "~/Scripts/modernizr-*"));

            bundles.Add(new ScriptBundle("~/bundles/bootstrap").Include(
                      "~/Scripts/bootstrap.js"));

            bundles.Add(new ScriptBundle("~/bundles/appjs").Include(
                      "~/Scripts/PageRecorder/Site.js",
                      "~/Scripts/PageRecorder/Controller.js",
                      "~/Scripts/PageRecorder/helpers.js",
                      "~/Scripts/PageRecorder/DOMChange.js",
                      "~/Scripts/PageRecorder/DOMPlayer.js",
                      "~/Scripts/PageRecorder/DOMRecorder.js"));

            bundles.Add(new StyleBundle("~/Content/css").Include(
                      "~/Content/bootstrap.css",
                      "~/Content/font-awesome.css",
                      "~/Content/PageRecorder/site.css",
                      "~/Content/PageRecorder/styles.css"));
        }
    }
}
