using PageRecorder.Helpers;
using PageRecorder.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;

namespace PageRecorder.Controllers
{
    public class HomeController : Controller
    {
        /// <summary>
        /// Primary view 
        /// </summary>
        /// <returns></returns>
        public ActionResult Index()
        {
            return View();
        }

        /// <summary>
        /// Returns the base HTML to start the playback session
        /// </summary>
        /// <param name="SessionID"></param>
        /// <returns></returns>
        public ActionResult Playback(int SessionID)
        {
            // This has zero security...
            // In a legit app we would verify access to this session ID
            // via auth cookie or auth header webtoken for API
            var model = SessionHelper.GetSession(SessionID);
            if(model==null)
            {
                throw new HttpException((int)HttpStatusCode.BadRequest, "Invalid session ID");
            }
            return Content(model.InitialDOM);
        }

        /// <summary>
        /// Saves the base html for a recording session
        /// </summary>
        public int Record(SessionModel model)
        {
            return SessionHelper.NewSession(model);
        }

        //
        // TODO: Implement websocket handlers to receive change events
        // as they occur on the page. Then send back those change events
        // in response to a playback session...
        ///
    }
}