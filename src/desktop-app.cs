using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Windows.Forms;

namespace MyBillBookApp
{
    public class Program
    {
        [STAThread]
        public static void Main()
        {
            try
            {
                string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
                string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
                
                // Smart environment detection:
                // Check if localhost dev server is running on 3001 or 3000, otherwise load production mybillbook.in!
                string url = "https://mybillbook.in";
                
                if (PingUrl("http://localhost:3001/dashboard"))
                {
                    url = "http://localhost:3001/dashboard";
                }
                else if (PingUrl("http://localhost:3000/dashboard"))
                {
                    url = "http://localhost:3000/dashboard";
                }

                if (File.Exists(edgePath))
                {
                    Process.Start(edgePath, "--app=\"" + url + "\" --window-size=1280,800");
                }
                else if (File.Exists(chromePath))
                {
                    Process.Start(chromePath, "--app=\"" + url + "\" --window-size=1280,800");
                }
                else
                {
                    Process.Start(url);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to launch desktop application: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static bool PingUrl(string url)
        {
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                request.Timeout = 1500; // 1.5 seconds timeout
                request.Method = "HEAD";
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }
    }
}
