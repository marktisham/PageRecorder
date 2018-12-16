using PageRecorder.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Web;

namespace PageRecorder.Helpers
{
    public class SessionHelper
    {
        public static int NewSession(SessionModel model)
        {
            // Ephemeral in memory single webserver storage...
            // In a legit app this would go into elasticache or redis or some equiv
            // caching layer, or a NoSql store if you wanted to persist it...
            int newSessionID = Interlocked.Increment(ref SessionID);
            SessionCache.Add(newSessionID, model);
            return newSessionID;
        }

        public static SessionModel GetSession(int sessionID)
        {
            if(SessionCache.ContainsKey(sessionID))
            {
                return SessionCache[sessionID];
            }
            return null;
        }

        public static Dictionary<int, SessionModel> SessionCache = new Dictionary<int, SessionModel>();
        public static int SessionID = 0;
    }
}