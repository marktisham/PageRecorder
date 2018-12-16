using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace PageRecorder.Models
{
    public class SessionModel
    {
        /// <summary>
        /// Base HTML to start a playback session
        /// </summary>
        public string InitialDOM { get; set; }
    }
}