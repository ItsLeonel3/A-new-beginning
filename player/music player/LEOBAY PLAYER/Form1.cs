using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace LEOBAY_PLAYER
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }

        string[] archivo, ruta;

        private void button7_Click(object sender, EventArgs e)
        {

            OpenFileDialog openFileDialog1 = new OpenFileDialog();
            openFileDialog1.Multiselect = true;


            if (openFileDialog1.ShowDialog() == System.Windows.Forms.DialogResult.OK)
            {
            
                archivo = openFileDialog1.SafeFileNames;
                ruta = openFileDialog1.FileNames;
                for (int i = 0; i < archivo.Length; i++)
                {
                    listBox2.Items.Add(archivo[i]);
                }

            }


        }

        private void button4_Click(object sender, EventArgs e)
        {
            axWindowsMediaPlayer2.Ctlcontrols.play();
        }

        private void button5_Click(object sender, EventArgs e)
        {
            axWindowsMediaPlayer2.Ctlcontrols.pause();
        }

        private void button6_Click(object sender, EventArgs e)
        {
            axWindowsMediaPlayer2.Ctlcontrols.stop();
        }

        private void listBox2_SelectedIndexChanged(object sender, EventArgs e)
        {
            axWindowsMediaPlayer2.URL = ruta[listBox2.SelectedIndex];
        }
    }

}
